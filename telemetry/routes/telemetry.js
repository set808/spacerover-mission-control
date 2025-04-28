const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // Add this import line
const TelemetryData = require("../models/telemetryData");
const { Rover } = require("../models/rover");
const winston = require("winston");
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp, ...metadata }) => {
      return `[${timestamp}] ${level}: ${message} ${
        Object.keys(metadata).length ? JSON.stringify(metadata) : ""
      }`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/telemetry-routes.log" }),
  ],
});

router.use((req, res, next) => {
  if (global.newrelic) {
    global.newrelic.addCustomAttribute("entity", "telemetry");
    global.newrelic.addCustomAttribute("operation", req.method);
  }
  next();
});

router.post("/receive", async (req, res, next) => {
  try {
    let endSegment;
    if (global.newrelic) {
      endSegment = global.newrelic.startSegment(
        "TelemetryProcessing",
        true,
        () => processTelemetryData(req.body)
      );
    }

    const result = await processTelemetryData(req.body);

    if (endSegment) endSegment();

    res.status(201).json(result);
  } catch (err) {
    logger.error("Error receiving telemetry data:", err);
    next(err);
  }
});

router.get("/rover/:roverId", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-telemetry-get-rover");
      global.newrelic.addCustomAttribute("roverId", req.params.roverId);
    }

    const rover = await Rover.findById(req.params.roverId);
    if (!rover) {
      logger.warn(`Rover not found: ${req.params.roverId}`);
      return res.status(404).json({ message: "Rover not found" });
    }

    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const startTime = req.query.startTime
      ? new Date(req.query.startTime)
      : null;
    const endTime = req.query.endTime ? new Date(req.query.endTime) : null;

    const query = { roverId: req.params.roverId };
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = startTime;
      if (endTime) query.timestamp.$lte = endTime;
    }

    let telemetryData;
    if (global.newrelic) {
      const endSegment = global.newrelic.startSegment(
        "MongoDB:TelemetryData.find",
        true,
        async () => {
          telemetryData = await TelemetryData.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip);
          return telemetryData;
        }
      );
      await endSegment();
    } else {
      telemetryData = await TelemetryData.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
    }

    const totalCount = await TelemetryData.countDocuments(query);

    logger.info(`Retrieved telemetry data for rover: ${rover.name}`, {
      roverId: req.params.roverId,
      count: telemetryData.length,
      totalMatches: totalCount,
    });

    res.json({
      rover: {
        id: rover._id,
        name: rover.name,
      },
      telemetry: telemetryData,
      pagination: {
        limit,
        skip,
        total: totalCount,
      },
    });
  } catch (err) {
    logger.error(
      `Error retrieving telemetry for rover ${req.params.roverId}:`,
      err
    );
    next(err);
  }
});

router.get("/latest", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-telemetry-latest");
    }

    const rovers = await Rover.find({ status: "active" });

    if (rovers.length === 0) {
      return res.json({ message: "No active rovers found", data: [] });
    }

    const latestTelemetry = await Promise.all(
      rovers.map(async (rover) => {
        const telemetry = await TelemetryData.findOne({
          roverId: rover._id,
        }).sort({ timestamp: -1 });

        return {
          rover: {
            id: rover._id,
            name: rover.name,
            model: rover.model,
            status: rover.status,
            planet: rover.location.planet,
          },
          telemetry: telemetry || null,
        };
      })
    );

    logger.info("Retrieved latest telemetry for all active rovers", {
      roverCount: rovers.length,
    });

    res.json(latestTelemetry);
  } catch (err) {
    logger.error("Error retrieving latest telemetry:", err);
    next(err);
  }
});

router.get("/stats/:roverId", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-telemetry-stats");
      global.newrelic.addCustomAttribute("roverId", req.params.roverId);
    }

    const rover = await Rover.findById(req.params.roverId);
    if (!rover) {
      logger.warn(`Rover not found: ${req.params.roverId}`);
      return res.status(404).json({ message: "Rover not found" });
    }

    const period = req.query.period || "24h";
    const endTime = new Date();
    let startTime = new Date(endTime);

    switch (period) {
      case "1h":
        startTime.setHours(endTime.getHours() - 1);
        break;
      case "6h":
        startTime.setHours(endTime.getHours() - 6);
        break;
      case "24h":
        startTime.setDate(endTime.getDate() - 1);
        break;
      case "7d":
        startTime.setDate(endTime.getDate() - 7);
        break;
      case "30d":
        startTime.setDate(endTime.getDate() - 30);
        break;
      default:
        startTime.setDate(endTime.getDate() - 1);
    }

    const stats = await TelemetryData.aggregate([
      {
        $match: {
          roverId: mongoose.Types.ObjectId(req.params.roverId),
          timestamp: {
            $gte: startTime,
            $lte: endTime,
          },
        },
      },
      {
        $group: {
          _id: null,
          avgBatteryLevel: { $avg: "$batteryLevel" },
          minBatteryLevel: { $min: "$batteryLevel" },
          maxBatteryLevel: { $max: "$batteryLevel" },
          avgTemperature: { $avg: "$temperatureC" },
          minTemperature: { $min: "$temperatureC" },
          maxTemperature: { $max: "$temperatureC" },
          avgCpuUtilization: { $avg: "$cpuUtilization" },
          avgMemoryUtilization: { $avg: "$memoryUtilization" },
          avgSignalStrength: { $avg: "$signalStrength" },
          dataPoints: { $sum: 1 },
          errorCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$errors" }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsResponse =
      stats.length > 0
        ? {
            roverId: req.params.roverId,
            roverName: rover.name,
            period,
            timeRange: {
              start: startTime,
              end: endTime,
            },
            statistics: {
              batteryLevel: {
                avg: parseFloat(stats[0].avgBatteryLevel.toFixed(2)),
                min: stats[0].minBatteryLevel,
                max: stats[0].maxBatteryLevel,
              },
              temperature: {
                avg: parseFloat(stats[0].avgTemperature.toFixed(2)),
                min: stats[0].minTemperature,
                max: stats[0].maxTemperature,
              },
              cpuUtilization: parseFloat(stats[0].avgCpuUtilization.toFixed(2)),
              memoryUtilization: parseFloat(
                stats[0].avgMemoryUtilization.toFixed(2)
              ),
              signalStrength: parseFloat(stats[0].avgSignalStrength.toFixed(2)),
              dataPoints: stats[0].dataPoints,
              errorCount: stats[0].errorCount,
            },
          }
        : {
            roverId: req.params.roverId,
            roverName: rover.name,
            period,
            timeRange: {
              start: startTime,
              end: endTime,
            },
            statistics: {
              message: "No data available for the specified period",
            },
          };

    logger.info(`Retrieved telemetry stats for rover: ${rover.name}`, {
      roverId: req.params.roverId,
      period,
      dataPoints: stats.length > 0 ? stats[0].dataPoints : 0,
    });

    res.json(statsResponse);
  } catch (err) {
    logger.error(
      `Error retrieving telemetry stats for rover ${req.params.roverId}:`,
      err
    );
    next(err);
  }
});

async function processTelemetryData(data) {
  if (!data.roverId) {
    throw new Error("Rover ID is required");
  }

  const rover = await Rover.findById(data.roverId);
  if (!rover) {
    throw new Error(`Rover not found: ${data.roverId}`);
  }

  const telemetryData = new TelemetryData(data);

  await telemetryData.save();

  rover.lastContact = new Date();
  if (data.batteryLevel !== undefined) {
    rover.batteryLevel = data.batteryLevel;
  }
  if (data.temperatureC !== undefined) {
    rover.temperatureC = data.temperatureC;
  }
  if (data.location && data.location.coordinates) {
    rover.location.coordinates = data.location.coordinates;
  }

  let statusChanged = false;
  let criticalCondition = false;
  let statusMessage = "";

  if (data.batteryLevel !== undefined && data.batteryLevel < 10) {
    statusMessage = "Critical battery level";
    criticalCondition = true;
  }

  if (
    data.temperatureC !== undefined &&
    (data.temperatureC > 80 || data.temperatureC < -40)
  ) {
    statusMessage = "Critical temperature";
    criticalCondition = true;
  }

  if (data.errors && data.errors.length > 0) {
    const criticalErrors = data.errors.filter((e) => e.severity === "critical");
    if (criticalErrors.length > 0) {
      statusMessage = `Critical error: ${criticalErrors[0].message}`;
      criticalCondition = true;
    }
  }

  if (data.signalStrength !== undefined && data.signalStrength < 15) {
    statusMessage = "Weak signal strength";
    if (data.signalStrength < 5) {
      statusMessage = "Signal loss imminent";
      criticalCondition = true;
    }
  }

  if (criticalCondition && rover.status !== "critical") {
    rover.status = "critical";
    statusChanged = true;
  } else if (!criticalCondition && rover.status === "critical") {
    rover.status = "active";
    statusChanged = true;
  }

  await rover.save();

  if (statusChanged) {
    logger.warn(`Rover status changed: ${rover.name}`, {
      roverId: rover._id,
      newStatus: rover.status,
      reason: statusMessage,
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("RoverStatusChange", {
        roverId: rover._id.toString(),
        roverName: rover.name,
        newStatus: rover.status,
        reason: statusMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logger.info(`Processed telemetry data for rover: ${rover.name}`, {
    roverId: rover._id,
    telemetryId: telemetryData._id,
    timestamp: telemetryData.timestamp,
  });

  return {
    success: true,
    telemetryId: telemetryData._id,
    timestamp: telemetryData.timestamp,
    roverStatus: {
      id: rover._id,
      name: rover.name,
      status: rover.status,
      statusChanged,
      statusMessage: statusChanged ? statusMessage : undefined,
    },
  };
}

module.exports = router;
