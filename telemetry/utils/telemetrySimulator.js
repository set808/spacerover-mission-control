const { Rover, ROVER_STATUSES } = require("../models/rover");
const TelemetryData = require("../models/telemetryData");
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
    new transports.File({ filename: "logs/telemetry-simulator.log" }),
  ],
});

let simulationInterval;
const TELEMETRY_INTERVAL = 15000;

function startTelemetrySimulation() {
  logger.info("Starting telemetry simulation");

  if (global.newrelic) {
    global.newrelic.recordCustomEvent("SimulationStatus", {
      type: "telemetry",
      status: "started",
      timestamp: new Date().toISOString(),
    });
  }

  simulationInterval = setInterval(async () => {
    try {
      const rovers = await Rover.find({ status: "active" });

      if (rovers.length === 0) {
        logger.info("No active rovers found, skipping telemetry generation");
        return;
      }

      for (const rover of rovers) {
        await generateTelemetryForRover(rover);
      }

      logger.info(`Generated telemetry for ${rovers.length} rovers`);
    } catch (err) {
      logger.error("Error generating telemetry:", err);

      if (global.newrelic) {
        global.newrelic.noticeError(err);
      }
    }
  }, TELEMETRY_INTERVAL);

  return simulationInterval;
}

function stopTelemetrySimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;

    logger.info("Stopped telemetry simulation");

    if (global.newrelic) {
      global.newrelic.recordCustomEvent("SimulationStatus", {
        type: "telemetry",
        status: "stopped",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

async function generateTelemetryForRover(rover) {
  try {
    const previousTelemetry = await TelemetryData.findOne({
      roverId: rover._id,
    }).sort({ timestamp: -1 });

    const telemetryData = new TelemetryData({
      roverId: rover._id,
      timestamp: new Date(),
      batteryLevel: generateBatteryLevel(rover, previousTelemetry),
      temperatureC: generateTemperature(rover, previousTelemetry),
      cpuUtilization: generateCpuUtilization(rover, previousTelemetry),
      memoryUtilization: generateMemoryUtilization(rover, previousTelemetry),
      diskSpaceRemaining: generateDiskSpace(rover, previousTelemetry),
      location: {
        coordinates: generateLocation(rover, previousTelemetry),
        planet: rover.location.planet,
      },
      signalStrength: generateSignalStrength(rover, previousTelemetry),
      sensorReadings: generateSensorReadings(rover, previousTelemetry),
      systemStatus: generateSystemStatus(rover, previousTelemetry),
      errors: generateErrors(rover, previousTelemetry),
    });

    await telemetryData.save();

    rover.lastContact = new Date();
    rover.batteryLevel = telemetryData.batteryLevel;
    rover.temperatureC = telemetryData.temperatureC;
    rover.location.coordinates = telemetryData.location.coordinates;
    await rover.save();

    logger.debug(`Generated telemetry for rover: ${rover.name}`, {
      roverId: rover._id,
      telemetryId: telemetryData._id,
    });

    return telemetryData;
  } catch (err) {
    logger.error(`Error generating telemetry for rover ${rover.name}:`, err);
    throw err;
  }
}

function generateBatteryLevel(rover, previous) {
  const prevLevel = previous ? previous.batteryLevel : rover.batteryLevel;

  let change = Math.random() * 0.5 - 0.3;

  const hour = new Date().getHours();
  if (hour >= 8 && hour <= 16) {
    change = Math.random() * 0.8;
  }

  let newLevel = prevLevel + change;
  newLevel = Math.max(0, Math.min(100, newLevel));

  return parseFloat(newLevel.toFixed(1));
}

function generateTemperature(rover, previous) {
  const prevTemp = previous ? previous.temperatureC : rover.temperatureC;

  const hour = new Date().getHours();
  let change = Math.random() * 2 - 1;

  if (hour >= 10 && hour <= 14) {
    change += 0.5;
  } else if (hour >= 0 && hour <= 4) {
    change -= 0.5;
  }

  if (Math.random() < 0.05) {
    change = Math.random() * 5 + 2;
  }

  return parseFloat((prevTemp + change).toFixed(1));
}

function generateCpuUtilization(rover, previous) {
  const baseUtilization = 20 + Math.random() * 10;

  if (Math.random() < 0.1) {
    return Math.min(100, baseUtilization + Math.random() * 40);
  }

  return parseFloat(baseUtilization.toFixed(1));
}

function generateMemoryUtilization(rover, previous) {
  const prevMemory = previous ? previous.memoryUtilization : 50;

  let newValue;
  if (prevMemory > 80 || Math.random() < 0.1) {
    newValue = prevMemory - Math.random() * 15;
  } else {
    newValue = prevMemory + Math.random() * 2;
  }

  return parseFloat(Math.max(20, Math.min(95, newValue)).toFixed(1));
}

function generateDiskSpace(rover, previous) {
  const prevSpace = previous ? previous.diskSpaceRemaining : 1000;

  const newSpace = prevSpace - Math.random() * 2;

  return Math.max(0, parseFloat(newSpace.toFixed(0)));
}

function generateLocation(rover, previous) {
  const prevX =
    previous && previous.location
      ? previous.location.coordinates.x
      : rover.location.coordinates.x;
  const prevY =
    previous && previous.location
      ? previous.location.coordinates.y
      : rover.location.coordinates.y;

  let moveDistance = 0;
  if (rover.status === "active") {
    moveDistance = Math.random() * 0.02;
  } else if (rover.status === "maintenance") {
    moveDistance = 0;
  }

  const angle = Math.random() * Math.PI * 2;
  const newX = prevX + moveDistance * Math.cos(angle);
  const newY = prevY + moveDistance * Math.sin(angle);

  return {
    x: parseFloat(newX.toFixed(6)),
    y: parseFloat(newY.toFixed(6)),
  };
}

function generateSignalStrength(rover, previous) {
  const baseStrength = 70 + Math.random() * 20;

  if (Math.random() < 0.05) {
    return Math.max(5, baseStrength - Math.random() * 40);
  }

  return parseFloat(baseStrength.toFixed(1));
}

function generateSensorReadings(rover, previous) {
  const readings = new Map();

  if (rover.capabilities.includes("weather")) {
    readings.set("windSpeed", parseFloat((Math.random() * 15).toFixed(1)));
    readings.set("pressure", parseFloat((700 + Math.random() * 50).toFixed(1)));
    readings.set("humidity", parseFloat((Math.random() * 100).toFixed(1)));
  }

  if (rover.capabilities.includes("spectroscopy")) {
    readings.set("mineralContent", {
      iron: parseFloat((Math.random() * 100).toFixed(1)),
      silicon: parseFloat((Math.random() * 100).toFixed(1)),
      aluminum: parseFloat((Math.random() * 100).toFixed(1)),
      calcium: parseFloat((Math.random() * 100).toFixed(1)),
      magnesium: parseFloat((Math.random() * 100).toFixed(1)),
    });
  }

  if (rover.capabilities.includes("imaging")) {
    readings.set("lightLevel", parseFloat((Math.random() * 100).toFixed(1)));
    readings.set("imagesTaken", Math.floor(Math.random() * 10));
  }

  return readings;
}

function generateSystemStatus(rover, previous) {
  const statuses = ["nominal", "nominal", "nominal", "degraded", "critical"];
  const weights = [0.8, 0.1, 0.05, 0.03, 0.02];

  const getStatus = () => {
    const rand = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (rand < sum) return statuses[i];
    }
    return "nominal";
  };

  const prevStatus = previous
    ? previous.systemStatus
    : {
        mainComputer: "nominal",
        navigationSystem: "nominal",
        communicationSystem: "nominal",
        powerSystem: "nominal",
        mobilitySystem: "nominal",
      };

  return {
    mainComputer: Math.random() < 0.95 ? prevStatus.mainComputer : getStatus(),
    navigationSystem:
      Math.random() < 0.95 ? prevStatus.navigationSystem : getStatus(),
    communicationSystem:
      Math.random() < 0.95 ? prevStatus.communicationSystem : getStatus(),
    powerSystem: Math.random() < 0.95 ? prevStatus.powerSystem : getStatus(),
    mobilitySystem:
      Math.random() < 0.95 ? prevStatus.mobilitySystem : getStatus(),
  };
}

function generateErrors(rover, previous) {
  const errors = [];

  const errorTypes = [
    { code: "E001", message: "Memory allocation failure", severity: "high" },
    { code: "E002", message: "Sensor calibration error", severity: "medium" },
    { code: "E003", message: "Communication timeout", severity: "medium" },
    { code: "E004", message: "Power system fluctuation", severity: "high" },
    { code: "E005", message: "Navigation system error", severity: "high" },
    {
      code: "E006",
      message: "Thermal regulation failure",
      severity: "critical",
    },
    { code: "E007", message: "Motor control error", severity: "medium" },
    { code: "E008", message: "Disk write failure", severity: "low" },
    { code: "E009", message: "Camera system error", severity: "low" },
    {
      code: "E010",
      message: "Battery management system alert",
      severity: "high",
    },
  ];

  if (Math.random() < 0.08) {
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    errors.push({
      code: errorType.code,
      message: errorType.message,
      severity: errorType.severity,
      timestamp: new Date(),
    });

    if (Math.random() < 0.2) {
      const anotherErrorType =
        errorTypes[Math.floor(Math.random() * errorTypes.length)];
      if (anotherErrorType.code !== errorType.code) {
        errors.push({
          code: anotherErrorType.code,
          message: anotherErrorType.message,
          severity: anotherErrorType.severity,
          timestamp: new Date(),
        });
      }
    }
  }

  return errors;
}

module.exports = {
  startTelemetrySimulation,
  stopTelemetrySimulation,
  generateTelemetryForRover,
};
