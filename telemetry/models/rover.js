const mongoose = require("mongoose");
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
    new transports.File({ filename: "logs/rover-model.log" }),
  ],
});

const ROVER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MAINTENANCE: "maintenance",
  CRITICAL: "critical",
  LOST_SIGNAL: "lost_signal",
};

const roverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ROVER_STATUSES),
      default: ROVER_STATUSES.INACTIVE,
    },
    location: {
      coordinates: {
        x: Number,
        y: Number,
      },
      planet: {
        type: String,
        required: true,
      },
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    temperatureC: {
      type: Number,
      default: 20,
    },
    lastContact: {
      type: Date,
      default: Date.now,
    },
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
    },
    capabilities: [
      {
        type: String,
        enum: ["sampling", "imaging", "drilling", "weather", "spectroscopy"],
      },
    ],
    telemetryFrequency: {
      type: Number,
      default: 60,
      min: 10,
      max: 3600,
    },
  },
  {
    timestamps: true,
  }
);

roverSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    logger.info(`Rover status changed for ${this.name}`, {
      roverId: this._id,
      previousStatus: this._oldStatus || "unknown",
      newStatus: this.status,
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("RoverStatusChange", {
        roverId: this._id.toString(),
        roverName: this.name,
        previousStatus: this._oldStatus || "unknown",
        newStatus: this.status,
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

roverSchema.virtual("batteryStatus").get(function () {
  if (this.batteryLevel > 75) return "Optimal";
  if (this.batteryLevel > 50) return "Good";
  if (this.batteryLevel > 25) return "Low";
  return "Critical";
});

roverSchema.methods.sendCommand = async function (command, params = {}) {
  logger.info(`Sending command to rover: ${command}`, {
    roverId: this._id,
    roverName: this.name,
    command,
    params,
    timestamp: new Date().toISOString(),
  });

  const processingTime = Math.floor(Math.random() * 500) + 100;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  let endCommandSpan;
  if (global.newrelic) {
    endCommandSpan = global.newrelic.startSegment(
      `RoverCommand:${command}`,
      true,
      () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const success = Math.random() > 0.1;
            if (!success) {
              logger.error(`Command failed: ${command}`, {
                roverId: this._id,
                command,
                reason: "Command execution error",
              });

              if (global.newrelic) {
                global.newrelic.noticeError(
                  new Error(`Rover command failed: ${command}`)
                );
              }
            }
            resolve(success);
          }, processingTime);
        });
      }
    );
  }

  this.lastContact = new Date();
  await this.save();

  if (endCommandSpan) endCommandSpan();

  return {
    success: true,
    command,
    timestamp: new Date(),
    roverId: this._id,
    processingTime,
  };
};

roverSchema.statics.findLowBattery = function (threshold = 25) {
  return this.find({
    batteryLevel: { $lt: threshold },
    status: ROVER_STATUSES.ACTIVE,
  }).sort({ batteryLevel: 1 });
};

const Rover = mongoose.model("Rover", roverSchema);
module.exports = { Rover, ROVER_STATUSES };
