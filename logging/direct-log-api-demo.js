const https = require("https");

const LICENSE_KEY = "YOUR_NEW_RELIC_LICENSE_KEY"; // Replace with your New Relic license key

function createSampleLog(type) {
  const timestamp = new Date().toISOString();
  const roverIds = [
    "60f1a5b3e8c7a234d0a91c23",
    "60f1a5b3e8c7a234d0a91c24",
    "60f1a5b3e8c7a234d0a91c25",
  ];
  const roverId = roverIds[Math.floor(Math.random() * roverIds.length)];
  const roverNames = ["Pathfinder", "Discovery", "Voyager"];
  const roverName = roverNames[Math.floor(Math.random() * roverNames.length)];

  switch (type) {
    case "info":
      return {
        timestamp,
        level: "info",
        message: `Telemetry data received from rover: ${roverName}`,
        metadata: {
          roverId,
          roverName,
          batteryLevel: Math.floor(50 + Math.random() * 40),
          signalStrength: Math.floor(70 + Math.random() * 25),
          service: "telemetry-processor",
        },
      };
    case "warning":
      return {
        timestamp,
        level: "warn",
        message: `Low battery warning for rover: ${roverName}`,
        metadata: {
          roverId,
          roverName,
          batteryLevel: Math.floor(10 + Math.random() * 15),
          signalStrength: Math.floor(60 + Math.random() * 20),
          service: "telemetry-processor",
        },
      };
    case "error":
      return {
        timestamp,
        level: "error",
        message: `Communication error with rover: ${roverName}`,
        metadata: {
          roverId,
          roverName,
          errorCode: "E003",
          retryCount: Math.floor(1 + Math.random() * 3),
          service: "telemetry-processor",
          stack:
            "Error: Connection timeout\n  at TelemetryService.connect (/app/services/telemetry.js:142:23)\n  at processTicksAndRejections (internal/process/task_queues.js:95:5)",
        },
      };
    case "critical":
      return {
        timestamp,
        level: "error",
        message: `CRITICAL: Lost signal with rover: ${roverName}`,
        metadata: {
          roverId,
          roverName,
          errorCode: "E006",
          lastContact: new Date(Date.now() - 1800000).toISOString(),
          batteryLevel: Math.floor(5 + Math.random() * 10),
          signalStrength: Math.floor(1 + Math.random() * 8),
          service: "telemetry-processor",
          priority: "critical",
        },
      };
    default:
      return {
        timestamp,
        level: "info",
        message: "Generic log message",
        metadata: {
          service: "telemetry-processor",
        },
      };
  }
}

// FIXED: Changed log formatting to use direct array of log entries
function formatLogs(logs) {
  // Create an array of log entries directly (no common or nested structure)
  return logs.map((log) => ({
    timestamp: new Date(log.timestamp).getTime(), // Convert ISO timestamp to milliseconds
    message: log.message,
    attributes: {
      level: log.level,
      service: "SpaceRover-TelemetryProcessor",
      hostname: "telemetry-processor-demo",
      environment: "demonstration",
      ...log.metadata,
    },
  }));
}

function sendLogsToNewRelic(logs) {
  const formattedLogs = formatLogs(logs);
  const data = JSON.stringify(formattedLogs);

  // Log the payload for debugging
  console.log("\nSending the following payload to New Relic:");
  console.log("First log entry sample:");
  console.log(JSON.stringify(formattedLogs[0], null, 2));
  console.log(`(${formattedLogs.length} total log entries)`);

  const options = {
    hostname: "log-api.newrelic.com",
    port: 443,
    path: "/log/v1",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "Api-Key": LICENSE_KEY,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log(`Response status code: ${res.statusCode}`);
        if (responseData) {
          console.log(`Response body: ${responseData}`);
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            status: res.statusCode,
            message: "Logs sent successfully to New Relic",
          });
        } else {
          console.error(
            `Error details: Status ${res.statusCode}, Body: ${responseData}`
          );
          reject({
            status: res.statusCode,
            message: `Failed to send logs: ${responseData}`,
          });
        }
      });
    });

    req.on("error", (error) => {
      console.error(`Network error details: ${error.message}`);
      reject({
        status: 0,
        message: `Error sending logs: ${error.message}`,
      });
    });

    req.write(data);
    req.end();
  });
}

async function runDemo() {
  console.log("🚀 Starting New Relic Log API Demo");
  console.log("Generating sample logs from SpaceRover Telemetry Service...");

  const logs = [
    createSampleLog("info"),
    createSampleLog("info"),
    createSampleLog("warning"),
    createSampleLog("error"),
    createSampleLog("info"),
    createSampleLog("critical"),
  ];

  logs.forEach((log, index) => {
    console.log(
      `Log ${index + 1}: [${log.level.toUpperCase()}] ${log.message}`
    );
  });

  console.log("\nSending logs to New Relic Log API...");
  try {
    const result = await sendLogsToNewRelic(logs);
    console.log(`✅ Success: ${result.message}`);
    console.log(
      "\nLogs have been sent to New Relic. You can now view them in:"
    );
    console.log("1. Logs UI in New Relic One");
    console.log("2. Run NRQL queries such as:");
    console.log(
      "   SELECT * FROM Log WHERE service = 'SpaceRover-TelemetryProcessor'"
    );
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error("Please check your New Relic license key and try again.");
  }
}

runDemo();
