const newrelic = require("newrelic");
global.newrelic = newrelic;

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
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
      filename: "logs/telemetry-error.log",
      level: "error",
    }),
    new transports.File({ filename: "logs/telemetry-combined.log" }),
  ],
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 6000;

// Middleware
app.use(cors());
app.use(express.json());

// Custom middleware for New Relic transaction naming
app.use((req, res, next) => {
  // Add custom attribute to the New Relic transaction
  if (global.newrelic) {
    global.newrelic.addCustomAttribute("requestPath", req.path);
    global.newrelic.addCustomAttribute("requestMethod", req.method);
    global.newrelic.addCustomAttribute("service", "telemetry-processor");
  }
  next();
});

// Request logging middleware
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Connect to MongoDB
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

// Models
const TelemetryData = require("./models/telemetryData");
const { Rover } = require("./models/rover");

// Routes
const telemetryRoutes = require("./routes/telemetry");
app.use("/api/telemetry", telemetryRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  // Custom transaction naming for New Relic
  if (global.newrelic) {
    global.newrelic.setTransactionName("health-check");
  }

  // Log health check with structured logging
  logger.info("Health check performed", {
    endpoint: "/health",
    status: "success",
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    status: "ok",
    service: "telemetry-processor",
    timestamp: new Date(),
  });
});

// Start telemetry simulation if enabled
if (process.env.ENABLE_SIMULATION === "true") {
  const { startTelemetrySimulation } = require("./utils/telemetrySimulator");
  startTelemetrySimulation();
  logger.info("Telemetry simulation enabled");
}

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log error with additional context
  logger.error(`Error processing request: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
    requestId: req.headers["x-request-id"] || "unknown",
  });

  // Record error in New Relic
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

// Start server
app.listen(PORT, () => {
  logger.info(`Telemetry Processor Service running on port ${PORT}`);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  // Record custom event in New Relic for service lifecycle tracking
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
