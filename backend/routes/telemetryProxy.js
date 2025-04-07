const express = require("express");
const router = express.Router();
const axios = require("axios");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const { Rover } = require("../models/rover"); // Add this import

const TELEMETRY_SERVICE_URL =
  process.env.TELEMETRY_SERVICE_URL || "http://localhost:6000";

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
    new transports.File({ filename: "logs/telemetry-proxy.log" }),
  ],
});

router.get("/latest", async (req, res, next) => {
  try {
    try {
      const targetUrl = `${TELEMETRY_SERVICE_URL}/api/telemetry/latest`;
      const response = await axios.get(targetUrl);

      if (Array.isArray(response.data) && response.data.length > 0) {
        return res.json(response.data);
      }

      logger.info(`No data from telemetry service, using fallback`);
    } catch (error) {
      logger.error(`Telemetry service error: ${error.message}`);
    }

    const rovers = await Rover.find();

    if (rovers.length === 0) {
      logger.info("No rovers found in database");
      return res.json([]);
    }

    const latestTelemetry = rovers.map((rover) => {
      const telemetry = {
        batteryLevel: rover.batteryLevel,
        temperatureC: rover.temperatureC,
        signalStrength: Math.floor(70 + Math.random() * 30),
        errors: [],
      };

      return {
        rover: {
          id: rover._id,
          name: rover.name,
          model: rover.model,
          status: rover.status,
          planet: rover.location?.planet || "Unknown",
        },
        telemetry: telemetry,
      };
    });

    logger.info(`Generated fallback telemetry for ${rovers.length} rovers`);
    res.json(latestTelemetry);
  } catch (err) {
    logger.error(`Error in /latest endpoint: ${err.message}`);
    next(err);
  }
});

router.all("/*", async (req, res, next) => {
  if (req.path === "/latest") return next();

  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-telemetry-proxy");
      global.newrelic.addCustomAttribute("proxyPath", req.path);
    }

    const targetUrl = `${TELEMETRY_SERVICE_URL}/api/telemetry${req.path}`;

    logger.info(`Proxying telemetry request to: ${targetUrl}`, {
      method: req.method,
      originalUrl: req.originalUrl,
      targetUrl,
    });

    const config = {
      method: req.method,
      url: targetUrl,
      params: req.query,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await axios(config);

    logger.info(`Telemetry proxy response from: ${targetUrl}`, {
      status: response.status,
      dataSize: JSON.stringify(response.data).length,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      logger.error(`Telemetry proxy error: ${err.message}`, {
        status: err.response.status,
        path: req.path,
      });
      res.status(err.response.status).json(err.response.data);
    } else {
      logger.error(`Telemetry proxy connection error: ${err.message}`);
      next(err);
    }
  }
});

module.exports = router;
