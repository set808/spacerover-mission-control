const axios = require("axios");

const API_URL = process.env.API_URL || "http://localhost:4000";
const SCENARIO = process.env.SCENARIO || "default";
const INTENSITY = process.env.INTENSITY || "medium"; // low, medium, high

console.log(`Load Generator starting...`);
console.log(`API URL: ${API_URL}`);
console.log(`Scenario: ${SCENARIO}`);
console.log(`Intensity: ${INTENSITY}`);

// Intensity settings
const intensitySettings = {
  low: {
    requestsPerBatch: 2,
    batchInterval: 10000, // 10 seconds
    errorRate: 0.05, // 5% errors
  },
  medium: {
    requestsPerBatch: 5,
    batchInterval: 5000, // 5 seconds
    errorRate: 0.1, // 10% errors
  },
  high: {
    requestsPerBatch: 10,
    batchInterval: 2000, // 2 seconds
    errorRate: 0.15, // 15% errors
  },
};

const settings = intensitySettings[INTENSITY] || intensitySettings.medium;

let roverIds = [];
let missionIds = [];

const endpoints = [
  { path: "/api/rovers", method: "get", weight: 10 },
  { path: "/api/missions", method: "get", weight: 5 },
  { path: "/api/telemetry/latest", method: "get", weight: 8 },
  { path: "/api/rovers/{roverId}", method: "get", weight: 8, needsId: true },
  {
    path: "/api/telemetry/rover/{roverId}",
    method: "get",
    weight: 6,
    needsId: true,
  },
  {
    path: "/api/telemetry/stats/{roverId}",
    method: "get",
    weight: 4,
    needsId: true,
  },
  {
    path: "/api/rovers/{roverId}/command",
    method: "post",
    weight: 2,
    needsId: true,
    hasBody: true,
  },
];

const totalWeight = endpoints.reduce(
  (sum, endpoint) => sum + endpoint.weight,
  0
);

const roverCommands = [
  { command: "move", params: { direction: "forward", distance: 10 } },
  { command: "move", params: { direction: "backward", distance: 5 } },
  { command: "turn", params: { direction: "left", degrees: 90 } },
  { command: "turn", params: { direction: "right", degrees: 45 } },
  { command: "sample", params: { depth: 5, duration: 30 } },
  { command: "image", params: { resolution: "high", panorama: true } },
  { command: "drill", params: { depth: 15, sampleSize: "medium" } },
  { command: "analyze", params: { type: "soil", method: "spectroscopy" } },
  { command: "status", params: { full: true } },
  { command: "sleep", params: { duration: 3600 } },
];

function selectRandomEndpoint() {
  const randomValue = Math.random() * totalWeight;
  let weightSum = 0;

  for (const endpoint of endpoints) {
    weightSum += endpoint.weight;
    if (randomValue <= weightSum) {
      return endpoint;
    }
  }

  return endpoints[0];
}

async function sendRequest() {
  try {
    const endpoint = selectRandomEndpoint();
    let url = `${API_URL}${endpoint.path}`;
    let config = {};
    let data = null;

    if (endpoint.needsId && roverIds.length > 0) {
      const roverId = roverIds[Math.floor(Math.random() * roverIds.length)];
      url = url.replace("{roverId}", roverId);
    }

    if (endpoint.method === "get") {
      config.params = {};

      if (url.includes("/telemetry/rover/")) {
        config.params.limit = Math.floor(Math.random() * 50) + 10;
      }

      if (url.includes("/telemetry/stats/")) {
        const periods = ["1h", "6h", "24h", "7d"];
        config.params.period =
          periods[Math.floor(Math.random() * periods.length)];
      }
    }

    if (endpoint.hasBody) {
      if (url.includes("/command")) {
        const command =
          roverCommands[Math.floor(Math.random() * roverCommands.length)];
        data = command;
      }
    }

    if (Math.random() < settings.errorRate) {
      if (endpoint.method === "post" && endpoint.hasBody) {
        data = { invalid: "data" };
      } else if (endpoint.needsId) {
        url = url.replace(/{roverId}/, "invalid-id-12345");
      }
    }

    console.log(`Sending ${endpoint.method.toUpperCase()} request to: ${url}`);

    let response;
    if (endpoint.method === "get") {
      response = await axios.get(url, config);
    } else if (endpoint.method === "post") {
      response = await axios.post(url, data, config);
    } else if (endpoint.method === "put") {
      response = await axios.put(url, data, config);
    } else if (endpoint.method === "delete") {
      response = await axios.delete(url, config);
    }

    console.log(`Response status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      console.log(
        `Error response: ${error.response.status} - ${error.response.statusText}`
      );
    } else {
      console.log(`Request error: ${error.message}`);
    }
  }
}

async function fetchRoverIds() {
  try {
    const response = await axios.get(`${API_URL}/api/rovers`);
    roverIds = response.data.map((rover) => rover._id);
    console.log(`Fetched ${roverIds.length} rover IDs`);
  } catch (error) {
    console.log(`Error fetching rover IDs: ${error.message}`);
  }
}

async function fetchMissionIds() {
  try {
    const response = await axios.get(`${API_URL}/api/missions`);
    missionIds = response.data.map((mission) => mission._id);
    console.log(`Fetched ${missionIds.length} mission IDs`);
  } catch (error) {
    console.log(`Error fetching mission IDs: ${error.message}`);
  }
}

async function generateBatch() {
  console.log(`Generating batch of ${settings.requestsPerBatch} requests...`);

  const requests = Array(settings.requestsPerBatch)
    .fill()
    .map(() => sendRequest());
  await Promise.all(requests);

  console.log("Batch completed");
}

async function refreshIds() {
  await fetchRoverIds();
  await fetchMissionIds();

  setTimeout(refreshIds, 5 * 60 * 1000);
}

async function runGenerator() {
  console.log("Load generator initializing...");

  await refreshIds();

  console.log(`Starting batch generation every ${settings.batchInterval}ms`);
  setInterval(generateBatch, settings.batchInterval);

  generateBatch();
}

runGenerator().catch((error) => {
  console.error("Fatal error in load generator:", error);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  process.exit(0);
});
