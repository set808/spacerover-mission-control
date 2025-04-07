// utils/backgroundTasks.js - Background tasks for demonstrating monitoring

const { Rover, ROVER_STATUSES } = require("../models/rover");
const Mission = require("../models/mission");
const winston = require("winston");
const { createLogger, format, transports } = winston;
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
    new transports.File({ filename: "logs/background-tasks.log" }),
  ],
});

const intervals = {
  batteryUpdates: null,
  missionProgress: null,
  roverHealthCheck: null,
  maintenanceScheduler: null,
  dataCleanup: null,
};

function startBackgroundTasks() {
  logger.info("Starting background tasks");

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("BackgroundTasksStarted", {
      timestamp: new Date().toISOString(),
    });
  }

  startBatteryUpdates();
  startMissionProgressUpdates();
  startRoverHealthChecks();
  startMaintenanceScheduler();
  startDataCleanupTask();
}

function stopBackgroundTasks() {
  logger.info("Stopping all background tasks");

  Object.values(intervals).forEach((interval) => {
    if (interval) clearInterval(interval);
  });

  Object.keys(intervals).forEach((key) => {
    intervals[key] = null;
  });

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("BackgroundTasksStopped", {
      timestamp: new Date().toISOString(),
    });
  }
}

// Task 1: Simulates battery drain and recharge for active rovers
function startBatteryUpdates() {
  // Run every 2 minutes
  intervals.batteryUpdates = setInterval(async () => {
    try {
      // Start New Relic custom segment
      let endSegment;
      if (global.newrelic) {
        endSegment = global.newrelic.startSegment(
          "BackgroundTask:BatteryUpdates",
          true,
          async () => {
            await updateRoverBatteries();
            return true;
          }
        );
      } else {
        await updateRoverBatteries();
      }

      if (endSegment) endSegment();
    } catch (err) {
      logger.error("Error in battery update task:", err);

      // Record error in New Relic
      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, 2 * 60 * 1000); // 2 minutes

  logger.info("Battery update task started");
}

// Actual battery update logic
async function updateRoverBatteries() {
  // Get all active rovers
  const rovers = await Rover.find({ status: ROVER_STATUSES.ACTIVE });

  if (rovers.length === 0) {
    logger.debug("No active rovers found for battery updates");
    return;
  }

  let updatedCount = 0;

  // Update each rover's battery
  for (const rover of rovers) {
    // Calculate battery change based on "time of day" simulation
    const hour = new Date().getHours();
    let batteryChange = 0;

    // Simulate solar charging during "daytime" hours
    if (hour >= 8 && hour <= 16) {
      // Charging during the day (solar panels active)
      batteryChange = Math.random() * 2; // Up to 2% increase
    } else {
      // Draining during "night" or when active
      batteryChange = -(Math.random() * 3); // Up to 3% decrease
    }

    // Apply change but keep within bounds
    let newBatteryLevel = rover.batteryLevel + batteryChange;
    newBatteryLevel = Math.max(0, Math.min(100, newBatteryLevel));

    // Only update if there's a meaningful change
    if (Math.abs(newBatteryLevel - rover.batteryLevel) > 0.1) {
      rover.batteryLevel = parseFloat(newBatteryLevel.toFixed(1));
      await rover.save();
      updatedCount++;
    }
  }

  logger.info(`Updated battery levels for ${updatedCount} rovers`);

  // Record custom metric in New Relic
  if (global.newrelic) {
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/BatteryUpdates",
      updatedCount
    );
  }
}

// Task 2: Updates mission progress
function startMissionProgressUpdates() {
  // Run every 5 minutes
  intervals.missionProgress = setInterval(async () => {
    try {
      // Start New Relic custom segment
      let endSegment;
      if (global.newrelic) {
        endSegment = global.newrelic.startSegment(
          "BackgroundTask:MissionProgressUpdates",
          true,
          async () => {
            await updateMissionProgress();
            return true;
          }
        );
      } else {
        await updateMissionProgress();
      }

      if (endSegment) endSegment();
    } catch (err) {
      logger.error("Error in mission progress update task:", err);

      // Record error in New Relic
      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  logger.info("Mission progress update task started");
}

// Actual mission progress update logic
async function updateMissionProgress() {
  // Get all active missions
  const missions = await Mission.findActiveMissions();

  if (missions.length === 0) {
    logger.debug("No active missions found for progress updates");
    return;
  }

  let updatedCount = 0;

  // Update each mission's objectives
  for (const mission of missions) {
    let changed = false;

    // Check if mission has objectives
    if (mission.objectives && mission.objectives.length > 0) {
      // Randomly complete some objectives
      mission.objectives.forEach((objective) => {
        if (!objective.completed && Math.random() < 0.05) {
          // 5% chance
          objective.completed = true;
          changed = true;

          logger.info(`Completed objective for mission: ${mission.name}`, {
            missionId: mission._id,
            objectiveTitle: objective.title,
          });

          // Record custom event in New Relic
          if (global.newrelic) {
            global.newrelic.recordCustomEvent("MissionObjectiveCompleted", {
              missionId: mission._id.toString(),
              missionName: mission.name,
              objectiveTitle: objective.title,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    }

    // Check if all objectives are completed
    const allCompleted =
      mission.objectives &&
      mission.objectives.length > 0 &&
      mission.objectives.every((obj) => obj.completed);

    // If all objectives completed, mark mission as completed
    if (allCompleted && mission.status === "active") {
      mission.status = "completed";
      mission.endDate = new Date();
      changed = true;

      logger.info(`Mission completed: ${mission.name}`, {
        missionId: mission._id,
        duration: mission.durationDays,
      });

      // Record custom event in New Relic
      if (global.newrelic) {
        global.newrelic.recordCustomEvent("MissionCompleted", {
          missionId: mission._id.toString(),
          missionName: mission.name,
          duration: mission.durationDays,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Save if changes were made
    if (changed) {
      await mission.save();
      updatedCount++;
    }
  }

  logger.info(`Updated progress for ${updatedCount} missions`);

  // Record custom metric in New Relic
  if (global.newrelic) {
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/MissionProgressUpdates",
      updatedCount
    );
  }
}

// Task 3: Performs health checks on rovers
function startRoverHealthChecks() {
  // Run every 3 minutes
  intervals.roverHealthCheck = setInterval(async () => {
    try {
      // Start New Relic custom segment
      let endSegment;
      if (global.newrelic) {
        endSegment = global.newrelic.startSegment(
          "BackgroundTask:RoverHealthChecks",
          true,
          async () => {
            await performRoverHealthChecks();
            return true;
          }
        );
      } else {
        await performRoverHealthChecks();
      }

      if (endSegment) endSegment();
    } catch (err) {
      logger.error("Error in rover health check task:", err);

      // Record error in New Relic
      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, 3 * 60 * 1000); // 3 minutes

  logger.info("Rover health check task started");
}

// Actual rover health check logic
async function performRoverHealthChecks() {
  // Get all rovers
  const rovers = await Rover.find();

  if (rovers.length === 0) {
    logger.debug("No rovers found for health checks");
    return;
  }

  let criticalCount = 0;
  let repairedCount = 0;
  let lostSignalCount = 0;

  // Check each rover's health
  for (const rover of rovers) {
    let statusChanged = false;
    let oldStatus = rover.status;

    // Check if rover hasn't sent telemetry for a while
    const lastContactTime = new Date(rover.lastContact).getTime();
    const currentTime = new Date().getTime();
    const hoursSinceContact =
      (currentTime - lastContactTime) / (1000 * 60 * 60);

    // If no contact for over 2 hours, mark as lost signal
    if (hoursSinceContact > 2 && rover.status !== ROVER_STATUSES.LOST_SIGNAL) {
      rover.status = ROVER_STATUSES.LOST_SIGNAL;
      statusChanged = true;
      lostSignalCount++;

      logger.warn(`Rover lost signal: ${rover.name}`, {
        roverId: rover._id,
        hoursSinceContact: hoursSinceContact.toFixed(1),
      });
    }

    // Check for critical battery level
    if (rover.batteryLevel < 10 && rover.status === ROVER_STATUSES.ACTIVE) {
      rover.status = ROVER_STATUSES.CRITICAL;
      statusChanged = true;
      criticalCount++;

      logger.warn(
        `Rover entered critical state due to low battery: ${rover.name}`,
        {
          roverId: rover._id,
          batteryLevel: rover.batteryLevel,
        }
      );
    }

    // Randomly repair rovers in maintenance
    if (rover.status === ROVER_STATUSES.MAINTENANCE && Math.random() < 0.3) {
      // 30% chance
      rover.status = ROVER_STATUSES.ACTIVE;
      statusChanged = true;
      repairedCount++;

      logger.info(`Rover maintenance completed: ${rover.name}`, {
        roverId: rover._id,
      });
    }

    // Save if status changed
    if (statusChanged) {
      await rover.save();

      // Record custom event in New Relic
      if (global.newrelic) {
        global.newrelic.recordCustomEvent("RoverStatusChange", {
          roverId: rover._id.toString(),
          roverName: rover.name,
          oldStatus,
          newStatus: rover.status,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  logger.info(
    `Completed rover health checks: ${criticalCount} critical, ${lostSignalCount} lost signal, ${repairedCount} repaired`
  );

  // Record custom metrics in New Relic
  if (global.newrelic) {
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/RoverHealthChecks/Critical",
      criticalCount
    );
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/RoverHealthChecks/LostSignal",
      lostSignalCount
    );
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/RoverHealthChecks/Repaired",
      repairedCount
    );
  }
}

// Task 4: Schedules rover maintenance
function startMaintenanceScheduler() {
  // Run every 7 minutes
  intervals.maintenanceScheduler = setInterval(async () => {
    try {
      // Start New Relic custom segment
      let endSegment;
      if (global.newrelic) {
        endSegment = global.newrelic.startSegment(
          "BackgroundTask:MaintenanceScheduler",
          true,
          async () => {
            await scheduleRoverMaintenance();
            return true;
          }
        );
      } else {
        await scheduleRoverMaintenance();
      }

      if (endSegment) endSegment();
    } catch (err) {
      logger.error("Error in maintenance scheduler task:", err);

      // Record error in New Relic
      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, 7 * 60 * 1000); // 7 minutes

  logger.info("Maintenance scheduler task started");
}

// Actual maintenance scheduling logic
async function scheduleRoverMaintenance() {
  // Get all active rovers
  const rovers = await Rover.find({ status: ROVER_STATUSES.ACTIVE });

  if (rovers.length === 0) {
    logger.debug("No active rovers found for maintenance scheduling");
    return;
  }

  let scheduledCount = 0;

  // Schedule maintenance for rovers with longer operation time
  for (const rover of rovers) {
    // 10% chance of scheduling maintenance for each active rover
    if (Math.random() < 0.1) {
      rover.status = ROVER_STATUSES.MAINTENANCE;
      await rover.save();
      scheduledCount++;

      logger.info(`Scheduled maintenance for rover: ${rover.name}`, {
        roverId: rover._id,
      });

      // Record custom event in New Relic
      if (global.newrelic) {
        global.newrelic.recordCustomEvent("RoverMaintenanceScheduled", {
          roverId: rover._id.toString(),
          roverName: rover.name,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  logger.info(`Scheduled maintenance for ${scheduledCount} rovers`);

  // Record custom metric in New Relic
  if (global.newrelic) {
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/MaintenanceScheduled",
      scheduledCount
    );
  }
}

// Task 5: Data cleanup task (simulates database maintenance)
function startDataCleanupTask() {
  // Run every 15 minutes
  intervals.dataCleanup = setInterval(async () => {
    try {
      // Start New Relic custom segment
      let endSegment;
      if (global.newrelic) {
        endSegment = global.newrelic.startSegment(
          "BackgroundTask:DataCleanup",
          true,
          async () => {
            await performDataCleanup();
            return true;
          }
        );
      } else {
        await performDataCleanup();
      }

      if (endSegment) endSegment();
    } catch (err) {
      logger.error("Error in data cleanup task:", err);

      // Record error in New Relic
      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, 15 * 60 * 1000); // 15 minutes

  logger.info("Data cleanup task started");
}

// Actual data cleanup logic
async function performDataCleanup() {
  logger.info("Starting data cleanup task");

  // Record custom event in New Relic
  if (global.newrelic) {
    global.newrelic.recordCustomEvent("DataCleanupStarted", {
      timestamp: new Date().toISOString(),
    });
  }

  // Simulate CPU-intensive operation
  const startTime = Date.now();
  let iterations = 0;

  // Run for 2-5 seconds to simulate database maintenance
  const duration = Math.floor(Math.random() * 3000) + 2000;
  while (Date.now() - startTime < duration) {
    // Perform some arbitrary calculations
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(Math.random() * 10000);
    }
    iterations++;
  }

  const actualDuration = Date.now() - startTime;

  logger.info(`Completed data cleanup task`, {
    duration: `${actualDuration}ms`,
    iterations,
  });

  // Record custom metrics in New Relic
  if (global.newrelic) {
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/DataCleanup/Duration",
      actualDuration
    );
    global.newrelic.recordMetric(
      "Custom/BackgroundTasks/DataCleanup/Iterations",
      iterations
    );
  }
}

module.exports = {
  startBackgroundTasks,
  stopBackgroundTasks,
};
