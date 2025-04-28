const newrelic = require("newrelic");

global.newrelic = newrelic;
global.appStartTime = new Date();

global.simulationState = {
  memoryLeak: {
    active: false,
    interval: null,
    arraySize: 0,
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
  },
};

const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const winston = require("winston");
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

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
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        printf(({ level, message, timestamp, ...metadata }) => {
          return `[${timestamp}] ${level}: ${message} ${
            Object.keys(metadata).length ? JSON.stringify(metadata) : ""
          }`;
        })
      ),
    }),
    new transports.File({
      filename: "logs/fleet-command-error.log",
      level: "error",
    }),
    new transports.File({ filename: "logs/fleet-command-combined.log" }),
  ],
});

const app = express();
const PORT = process.env.PORT || 4000;

// Set New Relic in app.locals for Express context (in addition to global)
app.locals.newrelic = newrelic;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (global.newrelic) {
    global.newrelic.addCustomAttribute("requestPath", req.path);
    global.newrelic.addCustomAttribute("requestMethod", req.method);
  }
  next();
});

app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/spacerover", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
  });

const roverRoutes = require("./routes/rover");
const missionRoutes = require("./routes/mission");
const simulationRoutes = require("./routes/simulation");
const telemetryProxyRoutes = require("./routes/telemetryProxy");

logger.info("Telemetry proxy routes enabled");

app.use("/api/rovers", roverRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/telemetry", telemetryProxyRoutes);

if (
  process.env.NODE_ENV === "development" ||
  process.env.ENABLE_SIMULATED_ISSUES === "true"
) {
  app.use("/api/simulation", simulationRoutes);
  logger.info("Simulation routes enabled");
}

app.get("/api/browser-monitoring", (req, res) => {
  if (newrelic) {
    res.send(newrelic.getBrowserTimingHeader());
  } else {
    res.status(404).send("Browser monitoring not available");
  }
});

// if (process.env.NODE_ENV === "production") {
// logger.info("Serving static frontend build");

//   app.set("views", path.join(__dirname, "../frontend/build"));
//   app.set("view engine", "ejs"); // We would need to add EJS for this approach

//   app.use(express.static(path.join(__dirname, "../frontend/build")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
//   });
// }

app.get("/health", (req, res) => {
  if (global.newrelic) {
    global.newrelic.setTransactionName("health-check");
  }

  logger.info("Health check performed", {
    endpoint: "/health",
    status: "success",
    timestamp: new Date().toISOString(),
  });

  res
    .status(200)
    .json({ status: "ok", service: "fleet-command", timestamp: new Date() });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error(`Error processing request: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
    requestId: req.headers["x-request-id"] || "unknown",
  });

  if (global.newrelic) {
    global.newrelic.noticeError(err);
  }

  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
      requestId: req.headers["x-request-id"] || "unknown",
    },
  });
});

const { startBackgroundTasks } = require("./utils/backgroundTasks");
startBackgroundTasks();

app.listen(PORT, () => {
  logger.info(`Fleet Command Service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  if (global.newrelic) {
    global.newrelic.recordCustomEvent("ServiceLifecycle", {
      action: "shutdown",
      reason: "SIGTERM",
      timestamp: new Date().toISOString(),
    });
  }

  mongoose.connection.close(() => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
});

module.exports = app;
