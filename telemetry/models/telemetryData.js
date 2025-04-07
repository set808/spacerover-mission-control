const mongoose = require("mongoose");

const telemetryDataSchema = new mongoose.Schema(
  {
    roverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rover",
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    temperatureC: {
      type: Number,
    },
    cpuUtilization: {
      type: Number,
      min: 0,
      max: 100,
    },
    memoryUtilization: {
      type: Number,
      min: 0,
      max: 100,
    },
    diskSpaceRemaining: {
      type: Number,
      min: 0,
    },
    location: {
      coordinates: {
        x: Number,
        y: Number,
      },
      planet: String,
    },
    signalStrength: {
      type: Number,
      min: 0,
      max: 100,
    },
    sensorReadings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    systemStatus: {
      mainComputer: {
        type: String,
        enum: ["nominal", "degraded", "critical", "offline"],
      },
      navigationSystem: {
        type: String,
        enum: ["nominal", "degraded", "critical", "offline"],
      },
      communicationSystem: {
        type: String,
        enum: ["nominal", "degraded", "critical", "offline"],
      },
      powerSystem: {
        type: String,
        enum: ["nominal", "degraded", "critical", "offline"],
      },
      mobilitySystem: {
        type: String,
        enum: ["nominal", "degraded", "critical", "offline"],
      },
    },
    errors: [
      {
        code: String,
        message: String,
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TelemetryData = mongoose.model("TelemetryData", telemetryDataSchema);

module.exports = TelemetryData;
