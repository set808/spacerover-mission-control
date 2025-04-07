const express = require("express");
const router = express.Router();
const { Rover, ROVER_STATUSES } = require("../models/rover");
const { createLogger, format, transports } = require("winston");
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
    new transports.File({ filename: "logs/rover-routes.log" }),
  ],
});

router.use((req, res, next) => {
  if (global.newrelic) {
    global.newrelic.addCustomAttribute("entity", "rover");
    global.newrelic.addCustomAttribute("roverOperation", req.method);
  }
  next();
});

router.get("/", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rovers-list");
    }

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.planet) filters["location.planet"] = req.query.planet;

    const rovers = await Rover.find(filters);

    logger.info("Retrieved rovers list", {
      count: rovers.length,
      filters: Object.keys(filters).length ? filters : "none",
    });

    res.json(rovers);
  } catch (err) {
    logger.error("Error retrieving rovers:", err);
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rover-get");
      global.newrelic.addCustomAttribute("roverId", req.params.id);
    }

    const rover = await Rover.findById(req.params.id);

    if (!rover) {
      logger.warn(`Rover not found: ${req.params.id}`);
      return res.status(404).json({ message: "Rover not found" });
    }

    logger.info(`Retrieved rover: ${rover.name}`);
    res.json(rover);
  } catch (err) {
    logger.error(`Error retrieving rover ${req.params.id}:`, err);
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rover-create");
    }

    const rover = new Rover(req.body);
    await rover.save();

    logger.info(`Created new rover: ${rover.name}`, {
      roverId: rover._id,
      model: rover.model,
      planet: rover.location.planet,
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("RoverCreated", {
        roverId: rover._id.toString(),
        name: rover.name,
        model: rover.model,
        planet: rover.location.planet,
      });
    }

    res.status(201).json(rover);
  } catch (err) {
    logger.error("Error creating rover:", err);
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const oldRover = await Rover.findById(req.params.id);
    if (!oldRover) {
      logger.warn(`Rover not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Rover not found" });
    }

    const oldStatus = oldRover.status;

    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rover-update");
      global.newrelic.addCustomAttribute("roverId", req.params.id);
    }

    const updatedRover = await Rover.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (oldStatus !== updatedRover.status) {
      logger.info(
        `Rover status changed: ${oldStatus} -> ${updatedRover.status}`,
        {
          roverId: updatedRover._id,
          name: updatedRover.name,
        }
      );

      if (global.newrelic) {
        global.newrelic.recordCustomEvent("RoverStatusUpdated", {
          roverId: updatedRover._id.toString(),
          name: updatedRover.name,
          oldStatus,
          newStatus: updatedRover.status,
          changedBy: req.body.changedBy || "system",
        });
      }
    }

    logger.info(`Updated rover: ${updatedRover.name}`);
    res.json(updatedRover);
  } catch (err) {
    logger.error(`Error updating rover ${req.params.id}:`, err);
    next(err);
  }
});

router.post("/:id/command", async (req, res, next) => {
  try {
    const { command, params } = req.body;

    if (!command) {
      return res.status(400).json({ message: "Command is required" });
    }

    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rover-command");
      global.newrelic.addCustomAttribute("roverId", req.params.id);
      global.newrelic.addCustomAttribute("command", command);
    }

    const rover = await Rover.findById(req.params.id);
    if (!rover) {
      logger.warn(`Rover not found for command: ${req.params.id}`);
      return res.status(404).json({ message: "Rover not found" });
    }

    if (rover.status !== ROVER_STATUSES.ACTIVE) {
      logger.warn(`Cannot send command to inactive rover: ${rover.name}`, {
        roverId: rover._id,
        status: rover.status,
        command,
      });
      return res.status(400).json({
        message: `Cannot send command to rover in ${rover.status} state`,
        roverId: rover._id,
        status: rover.status,
      });
    }

    const result = await rover.sendCommand(command, params);

    logger.info(`Command sent to rover: ${command}`, {
      roverId: rover._id,
      name: rover.name,
      result,
    });

    res.json(result);
  } catch (err) {
    logger.error(`Error sending command to rover ${req.params.id}:`, err);
    next(err);
  }
});

router.get("/status/low-battery", async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 25;

    if (global.newrelic) {
      global.newrelic.setTransactionName("api-rovers-low-battery");
      global.newrelic.addCustomAttribute("threshold", threshold);
    }

    const rovers = await Rover.findLowBattery(threshold);

    logger.info(`Retrieved low battery rovers`, {
      count: rovers.length,
      threshold,
    });

    res.json(rovers);
  } catch (err) {
    logger.error("Error retrieving low battery rovers:", err);
    next(err);
  }
});

module.exports = router;
