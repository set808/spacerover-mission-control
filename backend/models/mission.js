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
    new transports.File({ filename: "logs/mission-model.log" }),
  ],
});

const missionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    planet: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["planned", "active", "completed", "suspended", "failed"],
      default: "planned",
    },
    objectives: [
      {
        title: String,
        description: String,
        completed: {
          type: Boolean,
          default: false,
        },
        priority: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
      },
    ],
    leadScientist: {
      name: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

missionSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    logger.info(`Mission status changed for ${this.name}`, {
      missionId: this._id,
      previousStatus: this._oldStatus || "unknown",
      newStatus: this.status,
      timestamp: new Date().toISOString(),
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("MissionStatusChange", {
        missionId: this._id.toString(),
        missionName: this.name,
        previousStatus: this._oldStatus || "unknown",
        newStatus: this.status,
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

missionSchema.virtual("durationDays").get(function () {
  if (!this.startDate) return null;

  const endDate = this.endDate || new Date();
  const diffTime = Math.abs(endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

missionSchema.statics.findActiveMissions = function () {
  return this.find({ status: "active" }).sort({ startDate: 1 });
};

missionSchema.methods.addObjective = async function (objective) {
  this.objectives.push(objective);

  logger.info(`Added objective to mission: ${this.name}`, {
    missionId: this._id,
    objectiveTitle: objective.title,
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("MissionObjectiveAdded", {
      missionId: this._id.toString(),
      missionName: this.name,
      objectiveTitle: objective.title,
      priority: objective.priority,
      timestamp: new Date().toISOString(),
    });
  }

  return this.save();
};

const Mission = mongoose.model("Mission", missionSchema);
module.exports = Mission;
