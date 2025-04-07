// routes/simulation.js - Endpoints to trigger simulated issues for monitoring demonstrations

const express = require("express");
const router = express.Router();
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
    new transports.File({ filename: "logs/simulation-routes.log" }),
  ],
});

let memoryLeakArray = [];
let cpuLoadInterval = null;
let slowQueryEnabled = false;
let errorRatePercent = 0;
let logStormEnabled = false;
let logStormInterval = null;

router.use((req, res, next) => {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.ENABLE_SIMULATED_ISSUES !== "true"
  ) {
    return res.status(404).json({ message: "Not found" });
  }

  if (global.newrelic) {
    global.newrelic.addCustomAttribute("simulationEndpoint", req.path);
  }

  next();
});

router.get("/status", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-status");
  }

  const status = {
    memoryLeak: memoryLeakArray.length > 0,
    memoryLeakSize: `${(memoryLeakArray.length * 1024).toLocaleString()} bytes`,
    cpuLoad: cpuLoadInterval !== null,
    slowQuery: slowQueryEnabled,
    errorRate: errorRatePercent,
    logStorm: logStormEnabled,
  };

  logger.info("Simulation status retrieved", status);

  res.json({
    status,
    message: "Current simulation status",
  });
});

router.post("/memory-leak/start", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-memory-leak-start");
  }

  const size = parseInt(req.query.size) || 1000;
  const interval = parseInt(req.query.interval) || 1000;

  memoryLeakArray = [];

  const leakInterval = setInterval(() => {
    const newItems = Array(size)
      .fill(0)
      .map(() => ({
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        data: Buffer.alloc(1024).fill("A"), // Each object is roughly 1KB
        nestedObject: {
          properties: Array(10)
            .fill(0)
            .map((_, i) => ({ key: `property${i}`, value: Math.random() })),
        },
      }));

    memoryLeakArray.push(...newItems);

    const memoryUsage = process.memoryUsage();
    logger.warn("Memory leak simulation growing", {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      arraySize: memoryLeakArray.length,
      approximateMemoryUsage: `${Math.round(
        (memoryLeakArray.length * 1024) / 1024
      )} MB`,
    });

    if (global.newrelic) {
      global.newrelic.recordMetric(
        "Custom/MemoryLeak/Size",
        memoryLeakArray.length
      );
      global.newrelic.recordMetric(
        "Custom/MemoryLeak/MB",
        Math.round((memoryLeakArray.length * 1024) / 1024)
      );
    }
  }, interval);

  global.memoryLeakInterval = leakInterval;

  logger.warn("Memory leak simulation started", {
    size,
    interval,
    timestamp: new Date().toISOString(),
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationTriggered", {
      type: "memory-leak",
      action: "start",
      size,
      interval,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: "Memory leak simulation started",
    settings: { size, interval },
  });
});

router.post("/memory-leak/stop", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-memory-leak-stop");
  }

  if (global.memoryLeakInterval) {
    clearInterval(global.memoryLeakInterval);
    global.memoryLeakInterval = null;
  }

  const finalSize = memoryLeakArray.length;

  memoryLeakArray = [];

  if (global.gc) {
    global.gc();
    logger.info("Garbage collection triggered");
  }

  logger.info("Memory leak simulation stopped", {
    finalSize,
    timestamp: new Date().toISOString(),
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationTriggered", {
      type: "memory-leak",
      action: "stop",
      finalSize,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: "Memory leak simulation stopped",
    metrics: {
      finalSize,
      approximateMemoryUsage: `${Math.round((finalSize * 1024) / 1024)} MB`,
    },
  });
});

router.post("/cpu-load/start", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-cpu-load-start");
  }

  const intensity = parseInt(req.query.intensity) || 50;
  const duration = parseInt(req.query.duration) || 0;

  if (cpuLoadInterval) {
    clearInterval(cpuLoadInterval);
    cpuLoadInterval = null;
  }

  const consumeCPU = (percent) => {
    const start = Date.now();
    const burnMs = 100 * (percent / 100);
    const sleepMs = 100 - burnMs;

    while (Date.now() - start < burnMs) {
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(Math.random() * 10000);
      }
    }

    return new Promise((resolve) => setTimeout(resolve, sleepMs));
  };

  cpuLoadInterval = setInterval(async () => {
    await consumeCPU(intensity);

    logger.warn("CPU load simulation running", {
      intensity,
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordMetric("Custom/CPULoad/Intensity", intensity);
    }
  }, 100);

  if (duration > 0) {
    setTimeout(() => {
      if (cpuLoadInterval) {
        clearInterval(cpuLoadInterval);
        cpuLoadInterval = null;

        logger.info("CPU load simulation stopped (duration reached)", {
          intensity,
          duration,
          timestamp: new Date().toISOString(),
        });
      }
    }, duration * 1000);
  }

  logger.warn("CPU load simulation started", {
    intensity,
    duration: duration > 0 ? `${duration} seconds` : "until stopped",
    timestamp: new Date().toISOString(),
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationTriggered", {
      type: "cpu-load",
      action: "start",
      intensity,
      duration: duration > 0 ? duration : "indefinite",
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: "CPU load simulation started",
    settings: {
      intensity,
      duration: duration > 0 ? `${duration} seconds` : "until stopped",
    },
  });
});

router.post("/cpu-load/stop", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-cpu-load-stop");
  }

  if (cpuLoadInterval) {
    clearInterval(cpuLoadInterval);
    cpuLoadInterval = null;
  } else {
    return res.status(400).json({
      success: false,
      message: "No CPU load simulation is currently running",
    });
  }

  logger.info("CPU load simulation stopped", {
    timestamp: new Date().toISOString(),
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationTriggered", {
      type: "cpu-load",
      action: "stop",
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: "CPU load simulation stopped",
  });
});

router.post("/slow-query/:action", (req, res) => {
  const action = req.params.action.toLowerCase();

  if (global.newrelic) {
    global.newrelic.setTransactionName(`api-simulation-slow-query-${action}`);
  }

  if (action === "start") {
    const delay = parseInt(req.query.delay) || 2000; // milliseconds

    slowQueryEnabled = true;
    global.slowQueryDelay = delay;

    logger.warn("Slow query simulation started", {
      delay,
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("SimulationTriggered", {
        type: "slow-query",
        action: "start",
        delay,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Slow query simulation started",
      settings: { delay },
    });
  } else if (action === "stop") {
    slowQueryEnabled = false;
    global.slowQueryDelay = 0;

    logger.info("Slow query simulation stopped", {
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("SimulationTriggered", {
        type: "slow-query",
        action: "stop",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Slow query simulation stopped",
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid action. Use "start" or "stop".',
    });
  }
});

router.post("/error-rate", (req, res) => {
  const rate = parseInt(req.query.rate) || 0;

  if (global.newrelic) {
    global.newrelic.setTransactionName("api-simulation-error-rate");
  }

  if (rate < 0 || rate > 100) {
    return res.status(400).json({
      success: false,
      message: "Error rate must be between 0 and 100",
    });
  }

  errorRatePercent = rate;
  global.errorRatePercent = rate;

  logger.warn("Error rate simulation set", {
    rate,
    timestamp: new Date().toISOString(),
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationTriggered", {
      type: "error-rate",
      rate,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: `Error rate set to ${rate}%`,
  });
});

router.post("/log-storm/:action", (req, res) => {
  const action = req.params.action.toLowerCase();

  if (global.newrelic) {
    global.newrelic.setTransactionName(`api-simulation-log-storm-${action}`);
  }

  if (action === "start") {
    const rate = parseInt(req.query.rate) || 100;
    const severity = req.query.severity || "all";

    if (logStormInterval) {
      clearInterval(logStormInterval);
      logStormInterval = null;
    }

    const interval = Math.floor(1000 / rate);
    logStormEnabled = true;

    logStormInterval = setInterval(() => {
      const logTypes = ["INFO", "WARN", "ERROR"];
      const logType =
        severity === "all"
          ? logTypes[Math.floor(Math.random() * logTypes.length)]
          : severity.toUpperCase();

      const randomId = Math.random().toString(36).substring(2, 15);
      const messages = [
        `Random log message for simulation ${randomId}`,
        `System processing request ${randomId}`,
        `User action completed ${randomId}`,
        `Database query executed ${randomId}`,
        `Network request completed ${randomId}`,
        `File system operation ${randomId}`,
        `Cache entry updated ${randomId}`,
        `Authentication status changed ${randomId}`,
        `Session created for user ${randomId}`,
        `Resource allocation completed ${randomId}`,
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];

      switch (logType) {
        case "INFO":
          logger.info(message, { simulatedLog: true, id: randomId });
          break;
        case "WARN":
          logger.warn(message, { simulatedLog: true, id: randomId });
          break;
        case "ERROR":
          logger.error(message, { simulatedLog: true, id: randomId });
          if (global.newrelic) {
            global.newrelic.noticeError(
              new Error(`Simulated error: ${message}`)
            );
          }
          break;
      }
    }, interval);

    logger.warn("Log storm simulation started", {
      rate,
      severity,
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("SimulationTriggered", {
        type: "log-storm",
        action: "start",
        rate,
        severity,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Log storm simulation started",
      settings: { rate, severity },
    });
  } else if (action === "stop") {
    if (logStormInterval) {
      clearInterval(logStormInterval);
      logStormInterval = null;
      logStormEnabled = false;
    } else {
      return res.status(400).json({
        success: false,
        message: "No log storm simulation is currently running",
      });
    }

    logger.info("Log storm simulation stopped", {
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("SimulationTriggered", {
        type: "log-storm",
        action: "stop",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Log storm simulation stopped",
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid action. Use "start" or "stop".',
    });
  }
});

module.exports = router;
