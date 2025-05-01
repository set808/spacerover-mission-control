// unstructured-logs-demo.js
// Script to generate and send unstructured logs to New Relic for parsing demonstration
const https = require("https");

// Configuration - replace with your actual license key
const LICENSE_KEY = "YOUR_NEW_RELIC_LICENSE_KEY"; // Replace with your New Relic license key
// Choose the correct endpoint based on your account's data center
const USE_EU_DATACENTER = false; // Set to true if your account is in the EU data center
const LOG_API_ENDPOINT = USE_EU_DATACENTER
  ? "https://log-api.eu.newrelic.com/log/v1"
  : "https://log-api.newrelic.com/log/v1";

// Generate various unstructured log formats that would need parsing
function generateUnstructuredLogs() {
  const logs = [];

  // Apache-style access logs
  for (let i = 0; i < 5; i++) {
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
      Math.random() * 255
    )}`;
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    const methods = ["GET", "POST", "PUT", "DELETE"];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const paths = [
      "/api/rovers",
      "/api/missions",
      "/api/telemetry/latest",
      "/dashboard",
      "/settings",
    ];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const statusCodes = [200, 200, 200, 200, 201, 204, 400, 404, 500];
    const status = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const size = Math.floor(Math.random() * 10000);
    const referer =
      Math.random() > 0.5
        ? "https://spacerover-mission-control.com/dashboard"
        : "-";
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const time = Math.floor(Math.random() * 500);

    const accessLog = `${ip} - - [${timestamp}] "${method} ${path} HTTP/1.1" ${status} ${size} "${referer}" "${userAgent}" ${time}ms`;
    logs.push(accessLog);
  }

  // Custom application logs with different formats

  // Format 1: Simple timestamp and message
  logs.push(`[${new Date().toISOString()}] Server started on port 4000`);
  logs.push(
    `[${new Date().toISOString()}] Connected to MongoDB at mongodb://mongodb:27017/spacerover`
  );

  // Format 2: Timestamp, level, component and message
  logs.push(
    `${new Date().toISOString()} INFO [TelemetryService] Received data from rover Pathfinder`
  );
  logs.push(
    `${new Date().toISOString()} WARN [RoverController] Low battery detected on rover Discovery: 15%`
  );
  logs.push(
    `${new Date().toISOString()} ERROR [MissionService] Failed to update mission status: Database timeout`
  );

  // Format 3: Custom application format with different field separator
  logs.push(
    `TIMESTAMP=${new Date().toISOString()} | LEVEL=INFO | MODULE=Authentication | MESSAGE=User admin logged in | IP=10.0.0.5`
  );
  logs.push(
    `TIMESTAMP=${new Date().toISOString()} | LEVEL=ERROR | MODULE=DataSync | MESSAGE=Sync failed after 3 retries | COMPONENT=Telemetry`
  );

  // Format 4: JSON embedded in string with metadata
  logs.push(
    `Application log: {"timestamp":"${new Date().toISOString()}","level":"info","operation":"database-query","duration_ms":342,"rows_returned":25,"query_id":"q-12345"}`
  );
  logs.push(
    `Application log: {"timestamp":"${new Date().toISOString()}","level":"error","operation":"rover-command","command":"move","rover_id":"60f1a5b3e8c7a234d0a91c25","error_code":"E102","message":"Command timed out"}`
  );

  // Format 5: Unstructured error stack traces
  logs.push(`
[${new Date().toISOString()}] ERROR: Uncaught exception
TypeError: Cannot read property 'coordinates' of undefined
    at RoverController.updateLocation (/app/controllers/rover.js:156:23)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
    at async TelemetryService.processUpdate (/app/services/telemetry.js:78:12)
  `);

  // Format 6: Multi-line log entries
  logs.push(`
==== Mission Status Update ====
Time: ${new Date().toISOString()}
Mission: Red Horizon
Status: Active
Rovers: 3
Objectives Completed: 7/12
Next Scheduled Update: ${new Date(Date.now() + 3600000).toISOString()}
============================
  `);

  return logs;
}

// Format logs for New Relic Log API - CORRECTED FORMAT
function formatLogsForNewRelic(logs) {
  // Create an array of log entries - one for each log message
  const logEntries = logs.map((logMessage) => {
    return {
      // Each log message becomes a separate entry
      message: logMessage,
      timestamp: Date.now(),
      attributes: {
        logtype: "unstructured",
        source: "SpaceRover-LogParsingDemo",
      },
    };
  });

  // Return the properly formatted payload
  return logEntries;
}

// Send logs to New Relic Log API
function sendLogsToNewRelic(logs) {
  // Format logs into proper JSON structure
  const formattedLogs = formatLogsForNewRelic(logs);

  // Convert to JSON string
  const data = JSON.stringify(formattedLogs);

  // Parse hostname from the endpoint
  const url = new URL(LOG_API_ENDPOINT);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "Api-Key": LICENSE_KEY,
    },
  };

  return new Promise((resolve, reject) => {
    console.log(`\nSending logs to: ${options.hostname}${options.path}`);
    console.log(
      `Using license key: ${LICENSE_KEY.substring(
        0,
        6
      )}...${LICENSE_KEY.substring(LICENSE_KEY.length - 4)}`
    );

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

    // Print a sample log to help with debugging
    console.log("\nSample log entry:");
    console.log(JSON.stringify(formattedLogs[0], null, 2));
    console.log(`\nSending ${formattedLogs.length} log entries...`);

    req.write(data);
    req.end();
  });
}

// Main demo function
async function runDemo() {
  console.log("🚀 Starting New Relic Log Parsing Demo");
  console.log("Generating various unstructured log formats...");

  // Generate unstructured logs
  const logs = generateUnstructuredLogs();

  // Show log examples in console
  console.log("\nLog Samples (showing 3 examples):");
  console.log("-------------------------------------");
  for (let i = 0; i < 3 && i < logs.length; i++) {
    console.log(logs[i]);
    console.log("-------------------------------------");
  }
  console.log(
    `Generated ${logs.length} unstructured log entries in various formats`
  );

  // Send to New Relic
  console.log("\nSending unstructured logs to New Relic Log API...");
  try {
    const result = await sendLogsToNewRelic(logs);
    console.log(`✅ Success: ${result.message}`);
    console.log(
      "\nNow you can open New Relic to demonstrate parsing these logs."
    );
    console.log("\nQuery to find the logs:");
    console.log(
      "  SELECT * FROM Log WHERE source = 'SpaceRover-LogParsingDemo'"
    );
    console.log("\nParsing ideas to demonstrate:");
    console.log(
      "1. Parse Apache-style logs to extract method, path, status code, etc."
    );
    console.log(
      "2. Parse the timestamp, level, and component from application logs"
    );
    console.log("3. Extract key-value pairs from the pipe-delimited format");
    console.log("4. Extract JSON embedded within log messages");
    console.log("5. Configure multi-line log parsing for stack traces");
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error("Please check your New Relic license key and try again.");
  }
}

// Continuous log sending mode
async function runContinuousMode(intervalSeconds = 30) {
  console.log(
    `🔄 Starting continuous log generation mode (every ${intervalSeconds} seconds)`
  );
  console.log("Press Ctrl+C to stop");

  async function sendBatch() {
    const logs = generateUnstructuredLogs();
    try {
      await sendLogsToNewRelic(logs);
      console.log(
        `${new Date().toISOString()} - Sent ${logs.length} logs to New Relic`
      );
    } catch (error) {
      console.error(
        `${new Date().toISOString()} - Error sending logs: ${error.message}`
      );
    }
  }

  // Send first batch immediately
  await sendBatch();

  // Set up interval for additional batches
  setInterval(sendBatch, intervalSeconds * 1000);
}

// Check for command-line arguments
const args = process.argv.slice(2);
if (args.includes("--continuous") || args.includes("-c")) {
  // Extract interval if provided
  let interval = 30; // default 30 seconds
  const intervalArg = args.find(
    (arg) => arg.startsWith("--interval=") || arg.startsWith("-i=")
  );
  if (intervalArg) {
    const parsed = parseInt(intervalArg.split("=")[1]);
    if (!isNaN(parsed) && parsed > 0) {
      interval = parsed;
    }
  }
  runContinuousMode(interval);
} else {
  // Default: single batch mode
  runDemo();
}
