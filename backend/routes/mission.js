const express = require("express");
const router = express.Router();
const Mission = require("../models/mission");
const { Rover } = require("../models/rover");
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
    new transports.File({ filename: "logs/mission-routes.log" }),
  ],
});

router.use((req, res, next) => {
  if (global.newrelic) {
    global.newrelic.addCustomAttribute("entity", "mission");
    global.newrelic.addCustomAttribute("missionOperation", req.method);
  }
  next();
});

router.get("/", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-missions-list");
    }

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.planet) filters.planet = req.query.planet;

    if (global.slowQueryDelay && Math.random() < 0.3) {
      // 30% chance of slow query
      await new Promise((resolve) =>
        setTimeout(resolve, global.slowQueryDelay)
      );
      logger.info(
        `Simulated slow query delay of ${global.slowQueryDelay}ms for missions list`
      );
    }

    const missions = await Mission.find(filters);

    logger.info("Retrieved missions list", {
      count: missions.length,
      filters: Object.keys(filters).length ? filters : "none",
    });

    res.json(missions);
  } catch (err) {
    logger.error("Error retrieving missions:", err);
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-mission-get");
      global.newrelic.addCustomAttribute("missionId", req.params.id);
    }

    const mission = await Mission.findById(req.params.id);

    if (!mission) {
      logger.warn(`Mission not found: ${req.params.id}`);
      return res.status(404).json({ message: "Mission not found" });
    }

    logger.info(`Retrieved mission: ${mission.name}`);
    res.json(mission);
  } catch (err) {
    logger.error(`Error retrieving mission ${req.params.id}:`, err);
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-mission-create");
    }

    const mission = new Mission(req.body);
    await mission.save();

    logger.info(`Created new mission: ${mission.name}`, {
      missionId: mission._id,
      planet: mission.planet,
      status: mission.status,
    });

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("MissionCreated", {
        missionId: mission._id.toString(),
        name: mission.name,
        planet: mission.planet,
        status: mission.status,
      });
    }

    res.status(201).json(mission);
  } catch (err) {
    logger.error("Error creating mission:", err);
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const oldMission = await Mission.findById(req.params.id);
    if (!oldMission) {
      logger.warn(`Mission not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Mission not found" });
    }

    const oldStatus = oldMission.status;

    if (global.newrelic) {
      global.newrelic.setTransactionName("api-mission-update");
      global.newrelic.addCustomAttribute("missionId", req.params.id);
    }

    const updatedMission = await Mission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (oldStatus !== updatedMission.status) {
      logger.info(
        `Mission status changed: ${oldStatus} -> ${updatedMission.status}`,
        {
          missionId: updatedMission._id,
          name: updatedMission.name,
        }
      );

      if (global.newrelic) {
        global.newrelic.recordCustomEvent("MissionStatusUpdated", {
          missionId: updatedMission._id.toString(),
          name: updatedMission.name,
          oldStatus,
          newStatus: updatedMission.status,
          changedBy: req.body.changedBy || "system",
        });
      }
    }

    logger.info(`Updated mission: ${updatedMission.name}`);
    res.json(updatedMission);
  } catch (err) {
    logger.error(`Error updating mission ${req.params.id}:`, err);
    next(err);
  }
});

router.post("/:id/objectives", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-mission-add-objective");
      global.newrelic.addCustomAttribute("missionId", req.params.id);
    }

    const mission = await Mission.findById(req.params.id);

    if (!mission) {
      logger.warn(`Mission not found for adding objective: ${req.params.id}`);
      return res.status(404).json({ message: "Mission not found" });
    }

    await mission.addObjective(req.body);

    logger.info(`Added objective to mission: ${mission.name}`, {
      missionId: mission._id,
      objectiveTitle: req.body.title,
    });

    res.status(201).json(mission);
  } catch (err) {
    logger.error(`Error adding objective to mission ${req.params.id}:`, err);
    next(err);
  }
});

router.get("/:id/rovers", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-mission-rovers");
      global.newrelic.addCustomAttribute("missionId", req.params.id);
    }

    const mission = await Mission.findById(req.params.id);

    if (!mission) {
      logger.warn(`Mission not found for rovers: ${req.params.id}`);
      return res.status(404).json({ message: "Mission not found" });
    }

    const rovers = await Rover.find({ missionId: req.params.id });

    logger.info(`Retrieved rovers for mission: ${mission.name}`, {
      missionId: mission._id,
      roverCount: rovers.length,
    });

    res.json(rovers);
  } catch (err) {
    logger.error(`Error retrieving rovers for mission ${req.params.id}:`, err);
    next(err);
  }
});

router.get("/status/active", async (req, res, next) => {
  try {
    if (global.newrelic) {
      global.newrelic.setTransactionName("api-missions-active");
    }

    const missions = await Mission.findActiveMissions();

    logger.info("Retrieved active missions", {
      count: missions.length,
    });

    res.json(missions);
  } catch (err) {
    logger.error("Error retrieving active missions:", err);
    next(err);
  }
});

module.exports = router;
