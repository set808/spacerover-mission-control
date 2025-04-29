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

// Initialize global simulation state if it doesn't exist
if (!global.simulationState) {
  global.simulationState = {
    memoryLeak: {
      active: false,
      interval: null,
      arraySize: 0,
      array: [],
    },
    cpuLoad: {
      active: false,
      interval: null,
      intensity: 0,
    },
    slowQuery: {
      active: false,
      delay: 0,
    },
    errorRate: 0,
    logStorm: {
      active: false,
      interval: null,
      rate: 0,
      severity: "all",
    },
  };
}

// Direct access to memory leak array for simulation
let memoryLeakArray = global.simulationState.memoryLeak.array;

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
    memoryLeak: global.simulationState.memoryLeak.active,
    memoryLeakSize: global.simulationState.memoryLeak.active
      ? `${(
          global.simulationState.memoryLeak.arraySize * 1024
        ).toLocaleString()} bytes`
      : "0 bytes",
    cpuLoad: global.simulationState.cpuLoad.active,
    slowQuery: global.simulationState.slowQuery.active,
    errorRate: global.simulationState.errorRate,
    logStorm: global.simulationState.logStorm.active,
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

  // Stop any existing memory leak simulation first
  if (global.simulationState.memoryLeak.interval) {
    clearInterval(global.simulationState.memoryLeak.interval);
    global.simulationState.memoryLeak.interval = null;
  }

  const size = parseInt(req.query.size) || 1000;
  const interval = parseInt(req.query.interval) || 1000;

  // Reset the memory leak array
  memoryLeakArray = [];
  global.simulationState.memoryLeak.array = memoryLeakArray;
  global.simulationState.memoryLeak.arraySize = 0;

  const leakInterval = setInterval(() => {
    try {
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

      // Add items and update state
      memoryLeakArray.push(...newItems);
      global.simulationState.memoryLeak.arraySize = memoryLeakArray.length;

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
    } catch (err) {
      logger.error("Error in memory leak simulation:", err);
      // Don't stop the simulation on error, just log it
    }
  }, interval);

  // Update state
  global.simulationState.memoryLeak.active = true;
  global.simulationState.memoryLeak.interval = leakInterval;

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

  const finalSize = memoryLeakArray.length;

  // Clean up interval
  if (global.simulationState.memoryLeak.interval) {
    clearInterval(global.simulationState.memoryLeak.interval);
    global.simulationState.memoryLeak.interval = null;
  }

  // Reset array and state
  memoryLeakArray = [];
  global.simulationState.memoryLeak.array = memoryLeakArray;
  global.simulationState.memoryLeak.arraySize = 0;
  global.simulationState.memoryLeak.active = false;

  // Try to free memory explicitly
  if (global.gc) {
    try {
      global.gc();
      logger.info("Garbage collection triggered");
    } catch (err) {
      logger.error("Error during garbage collection:", err);
    }
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

  // Stop any existing CPU load simulation
  if (global.simulationState.cpuLoad.interval) {
    clearInterval(global.simulationState.cpuLoad.interval);
    global.simulationState.cpuLoad.interval = null;
  }

  const intensity = parseInt(req.query.intensity) || 50;
  const duration = parseInt(req.query.duration) || 0;

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

  const cpuLoadInterval = setInterval(async () => {
    try {
      await consumeCPU(intensity);

      logger.warn("CPU load simulation running", {
        intensity,
        timestamp: new Date().toISOString(),
      });

      if (global.newrelic) {
        global.newrelic.recordMetric("Custom/CPULoad/Intensity", intensity);
      }
    } catch (err) {
      logger.error("Error in CPU load simulation:", err);
      // Don't stop the simulation on error, just log it
    }
  }, 100);

  // Update state
  global.simulationState.cpuLoad.active = true;
  global.simulationState.cpuLoad.interval = cpuLoadInterval;
  global.simulationState.cpuLoad.intensity = intensity;

  // Set up auto-stop if duration is specified
  if (duration > 0) {
    setTimeout(() => {
      try {
        if (global.simulationState.cpuLoad.active) {
          clearInterval(global.simulationState.cpuLoad.interval);
          global.simulationState.cpuLoad.interval = null;
          global.simulationState.cpuLoad.active = false;

          logger.info("CPU load simulation stopped (duration reached)", {
            intensity,
            duration,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error("Error stopping CPU load simulation after duration:", err);
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

  if (!global.simulationState.cpuLoad.active) {
    return res.status(400).json({
      success: false,
      message: "No CPU load simulation is currently running",
    });
  }

  // Clean up and update state
  if (global.simulationState.cpuLoad.interval) {
    clearInterval(global.simulationState.cpuLoad.interval);
    global.simulationState.cpuLoad.interval = null;
  }

  global.simulationState.cpuLoad.active = false;

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

    // Update state
    global.simulationState.slowQuery.active = true;
    global.simulationState.slowQuery.delay = delay;
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
    // Update state
    global.simulationState.slowQuery.active = false;
    global.simulationState.slowQuery.delay = 0;
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

  // Update state
  global.simulationState.errorRate = rate;
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
    // Stop any existing log storm
    if (global.simulationState.logStorm.interval) {
      clearInterval(global.simulationState.logStorm.interval);
      global.simulationState.logStorm.interval = null;
    }

    const rate = parseInt(req.query.rate) || 100;
    const severity = req.query.severity || "all";

    const interval = Math.floor(1000 / rate);

    const logStormInterval = setInterval(() => {
      try {
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
      } catch (err) {
        logger.error("Error in log storm simulation:", err);
        // Don't stop the simulation on error, just log it
      }
    }, interval);

    // Update state
    global.simulationState.logStorm.active = true;
    global.simulationState.logStorm.interval = logStormInterval;
    global.simulationState.logStorm.rate = rate;
    global.simulationState.logStorm.severity = severity;

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
    if (!global.simulationState.logStorm.active) {
      return res.status(400).json({
        success: false,
        message: "No log storm simulation is currently running",
      });
    }

    // Clean up and update state
    if (global.simulationState.logStorm.interval) {
      clearInterval(global.simulationState.logStorm.interval);
      global.simulationState.logStorm.interval = null;
    }

    global.simulationState.logStorm.active = false;

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
