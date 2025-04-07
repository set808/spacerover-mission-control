db = db.getSiblingDB("spacerover");

db.rovers.drop();
db.missions.drop();
db.telemetryData.drop();

const planets = [
  { name: "Mars", description: "The red planet", gravity: 0.38 },
  { name: "Europa", description: "Jupiter's icy moon", gravity: 0.13 },
  { name: "Titan", description: "Saturn's largest moon", gravity: 0.14 },
  {
    name: "Enceladus",
    description: "Saturn's icy moon with geysers",
    gravity: 0.11,
  },
];

const missionIds = [];
const missions = [
  {
    name: "Red Horizon",
    description: "Long-term exploration of the Martian surface",
    planet: "Mars",
    startDate: new Date("2024-03-15"),
    endDate: new Date("2025-06-30"),
    status: "active",
  },
  {
    name: "Europa Deep Ice",
    description: "Investigation of subsurface oceans on Europa",
    planet: "Europa",
    startDate: new Date("2024-05-20"),
    endDate: new Date("2025-09-10"),
    status: "active",
  },
  {
    name: "Titan Lakes Survey",
    description: "Methane lakes exploration on Titan",
    planet: "Titan",
    startDate: new Date("2024-02-10"),
    endDate: new Date("2025-04-25"),
    status: "active",
  },
  {
    name: "Enceladus Geysers Study",
    description: "Study of water geysers on Enceladus",
    planet: "Enceladus",
    startDate: new Date("2024-07-05"),
    endDate: null,
    status: "planned",
  },
];

print("Creating missions...");
missions.forEach((mission) => {
  const result = db.missions.insertOne(mission);
  missionIds.push(result.insertedId);
  print(`Created mission: ${mission.name} with ID: ${result.insertedId}`);
});

const rovers = [
  {
    name: "Pathfinder",
    model: "Explorer Mark I",
    status: "active",
    location: {
      coordinates: { x: 142.51, y: 68.24 },
      planet: "Mars",
    },
    batteryLevel: 83,
    temperatureC: 22,
    lastContact: new Date(),
    missionId: missionIds[0],
    capabilities: ["imaging", "sampling", "drilling"],
    telemetryFrequency: 60,
  },
  {
    name: "Discovery",
    model: "Explorer Mark II",
    status: "active",
    location: {
      coordinates: { x: 178.92, y: 33.45 },
      planet: "Mars",
    },
    batteryLevel: 91,
    temperatureC: 19,
    lastContact: new Date(),
    missionId: missionIds[0],
    capabilities: ["imaging", "sampling", "weather", "spectroscopy"],
    telemetryFrequency: 45,
  },
  {
    name: "Voyager",
    model: "Deep Space 1",
    status: "maintenance",
    location: {
      coordinates: { x: 56.78, y: 12.39 },
      planet: "Europa",
    },
    batteryLevel: 45,
    temperatureC: -56,
    lastContact: new Date(Date.now() - 3600000), // 1 hour ago
    missionId: missionIds[1],
    capabilities: ["imaging", "drilling", "spectroscopy"],
    telemetryFrequency: 90,
  },
  {
    name: "Pioneer",
    model: "Deep Space 2",
    status: "active",
    location: {
      coordinates: { x: 89.32, y: 45.67 },
      planet: "Europa",
    },
    batteryLevel: 78,
    temperatureC: -52,
    lastContact: new Date(),
    missionId: missionIds[1],
    capabilities: ["imaging", "sampling", "weather"],
    telemetryFrequency: 60,
  },
  {
    name: "Horizon",
    model: "Methane Explorer 1",
    status: "active",
    location: {
      coordinates: { x: 112.45, y: 87.21 },
      planet: "Titan",
    },
    batteryLevel: 64,
    temperatureC: -178,
    lastContact: new Date(),
    missionId: missionIds[2],
    capabilities: ["imaging", "sampling", "weather", "spectroscopy"],
    telemetryFrequency: 30,
  },
  {
    name: "Surveyor",
    model: "Methane Explorer 2",
    status: "critical",
    location: {
      coordinates: { x: 143.78, y: 92.13 },
      planet: "Titan",
    },
    batteryLevel: 12,
    temperatureC: -181,
    lastContact: new Date(Date.now() - 1800000), // 30 minutes ago
    missionId: missionIds[2],
    capabilities: ["imaging", "drilling"],
    telemetryFrequency: 120,
  },
];

print("Creating rovers...");
rovers.forEach((rover) => {
  const result = db.rovers.insertOne(rover);
  print(`Created rover: ${rover.name} with ID: ${result.insertedId}`);
});

print("Creating sample telemetry data...");
rovers.forEach((rover) => {
  const insertedRover = db.rovers.findOne({ name: rover.name });

  if (insertedRover) {
    for (let i = 0; i < 5; i++) {
      const timeOffset = i * 60 * 60 * 1000; // hours in the past
      const telemetry = {
        roverId: insertedRover._id,
        timestamp: new Date(Date.now() - timeOffset),
        batteryLevel: rover.batteryLevel - Math.random() * 5,
        temperatureC: rover.temperatureC + (Math.random() * 4 - 2),
        cpuUtilization: 20 + Math.random() * 30,
        memoryUtilization: 30 + Math.random() * 40,
        diskSpaceRemaining: 800 + Math.random() * 200,
        location: {
          coordinates: {
            x: rover.location.coordinates.x + (Math.random() * 0.1 - 0.05),
            y: rover.location.coordinates.y + (Math.random() * 0.1 - 0.05),
          },
          planet: rover.location.planet,
        },
        signalStrength: 60 + Math.random() * 30,
        systemStatus: {
          mainComputer: "nominal",
          navigationSystem: "nominal",
          communicationSystem: "nominal",
          powerSystem: "nominal",
          mobilitySystem: "nominal",
        },
        errors: [],
      };

      if (Math.random() < 0.2) {
        telemetry.errors.push({
          code: "E00" + Math.floor(Math.random() * 9 + 1),
          message: "Minor system fluctuation",
          severity: "low",
          timestamp: telemetry.timestamp,
        });
      }

      if (rover.status === "critical") {
        telemetry.batteryLevel = 10 + Math.random() * 5;
        telemetry.errors.push({
          code: "E010",
          message: "Battery management system alert",
          severity: "critical",
          timestamp: telemetry.timestamp,
        });
      }

      db.telemetryData.insertOne(telemetry);
    }

    print(`Created telemetry data for rover: ${rover.name}`);
  }
});

db.rovers.createIndex({ status: 1 });
db.rovers.createIndex({ "location.planet": 1 });
db.telemetryData.createIndex({ roverId: 1, timestamp: -1 });
db.missions.createIndex({ status: 1 });

print("Database initialization complete!");
