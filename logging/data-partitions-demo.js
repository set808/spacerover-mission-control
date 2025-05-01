const https = require("https");

// Configuration - replace with your actual values
const LICENSE_KEY = "YOUR_NEW_RELIC_LICENSE_KEY";
const ACCOUNT_ID = "YOUR_ACCOUNT_ID"; // Your New Relic account ID
const USER_API_KEY = "YOUR_USER_API_KEY"; // User API key with appropriate permissions

// Environment names to demonstrate partitioning
const ENVIRONMENTS = ["production", "staging", "development", "testing"];

// Service names to demonstrate partitioning
const SERVICES = [
  "api-gateway",
  "user-service",
  "payment-service",
  "inventory-service",
  "notification-service",
];

// Demo settings
const DEMO_SETTINGS = {
  // Number of log entries to generate per service/environment combination
  logsPerCombination: 5,
  // Number of events to generate for each service/environment
  eventsPerCombination: 5,
  // Include a timestamp delay between batches (ms)
  batchDelay: 500,
};

/**
 * Generate log entries with attributes appropriate for data partitions demonstration
 */
function generateLogEntries() {
  const logs = [];

  for (const env of ENVIRONMENTS) {
    for (const service of SERVICES) {
      // Generate logs for each environment/service combination
      for (let i = 0; i < DEMO_SETTINGS.logsPerCombination; i++) {
        // Create a log entry with attributes that can be used for partitioning
        logs.push({
          timestamp: Date.now(),
          message: `[${service}] Sample log message #${
            i + 1
          } for ${env} environment`,
          attributes: {
            environment: env,
            service: service,
            region: getRandomRegion(),
            customerId: getRandomCustomerId(env),
            logLevel: getRandomLogLevel(),
            partitionDemo: true,
          },
        });
      }
    }
  }

  return logs;
}

/**
 * Generate custom events with attributes appropriate for data partitions demonstration
 */
function generateCustomEvents() {
  const events = [];

  for (const env of ENVIRONMENTS) {
    for (const service of SERVICES) {
      // Generate events for each environment/service combination
      for (let i = 0; i < DEMO_SETTINGS.eventsPerCombination; i++) {
        // Create an event with attributes that can be used for partitioning
        events.push({
          eventType: "DataPartitionDemo",
          timestamp: Date.now(),
          environment: env,
          service: service,
          region: getRandomRegion(),
          customerId: getRandomCustomerId(env),
          duration: Math.floor(Math.random() * 500),
          statusCode: getRandomStatusCode(),
          partitionDemo: true,
        });
      }
    }
  }

  return events;
}

// Helper functions for generating sample data
function getRandomRegion() {
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
  return regions[Math.floor(Math.random() * regions.length)];
}

function getRandomCustomerId(env) {
  // Generate different customer IDs for each environment
  // This simulates data isolation between customer data in different environments
  const prefix =
    env === "production"
      ? "cust"
      : env === "staging"
      ? "stg"
      : env === "development"
      ? "dev"
      : "test";

  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function getRandomLogLevel() {
  const levels = ["INFO", "WARN", "ERROR", "DEBUG"];
  const weights = [70, 15, 5, 10]; // Weighted distribution

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < levels.length; i++) {
    if (random < weights[i]) {
      return levels[i];
    }
    random -= weights[i];
  }

  return levels[0];
}

function getRandomStatusCode() {
  const codes = [200, 201, 204, 400, 401, 403, 404, 500];
  const weights = [70, 10, 5, 5, 3, 2, 3, 2]; // Weighted distribution

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < codes.length; i++) {
    if (random < weights[i]) {
      return codes[i];
    }
    random -= weights[i];
  }

  return codes[0];
}

/**
 * Send logs to New Relic Log API
 */
function sendLogs(logs) {
  const data = JSON.stringify(logs);

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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            status: res.statusCode,
            message: "Logs sent successfully",
            data: responseData,
          });
        } else {
          reject({
            status: res.statusCode,
            message: `Failed to send logs: ${responseData}`,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject({
        status: 0,
        message: `Error sending logs: ${error.message}`,
      });
    });

    req.write(data);
    req.end();
  });
}

/**
 * Send custom events to New Relic Insights API
 */
function sendEvents(events) {
  const data = JSON.stringify(events);

  const options = {
    hostname: "insights-collector.newrelic.com",
    port: 443,
    path: `/v1/accounts/${ACCOUNT_ID}/events`,
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            status: res.statusCode,
            message: "Events sent successfully",
            data: responseData,
          });
        } else {
          reject({
            status: res.statusCode,
            message: `Failed to send events: ${responseData}`,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject({
        status: 0,
        message: `Error sending events: ${error.message}`,
      });
    });

    req.write(data);
    req.end();
  });
}

/**
 * Create API calls for data partition related operations
 */
const DataPartitionAPI = {
  // Get all data partitions in the account
  listPartitions: () => {
    return makeNRDBRequest("GET", `/data/v1/accounts/${ACCOUNT_ID}/partitions`);
  },

  // Create a new data partition rule based on an attribute
  createPartition: (name, description, config) => {
    const payload = {
      name,
      description,
      config,
    };

    return makeNRDBRequest(
      "POST",
      `/data/v1/accounts/${ACCOUNT_ID}/partitions`,
      payload
    );
  },

  // Get information about a specific partition by ID
  getPartition: (partitionId) => {
    return makeNRDBRequest(
      "GET",
      `/data/v1/accounts/${ACCOUNT_ID}/partitions/${partitionId}`
    );
  },

  // Delete a partition by ID
  deletePartition: (partitionId) => {
    return makeNRDBRequest(
      "DELETE",
      `/data/v1/accounts/${ACCOUNT_ID}/partitions/${partitionId}`
    );
  },
};

/**
 * Helper function for making API requests to New Relic
 */
function makeNRDBRequest(method, path, payload = null) {
  const data = payload ? JSON.stringify(payload) : "";

  const options = {
    hostname: "api.newrelic.com",
    port: 443,
    path: path,
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": USER_API_KEY,
    },
  };

  if (payload) {
    options.headers["Content-Length"] = data.length;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve(parsedData);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject({
            status: res.statusCode,
            message: `API request failed: ${responseData}`,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject({
        status: 0,
        message: `Error making API request: ${error.message}`,
      });
    });

    if (payload) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Generate NRQL query suggestions for demonstrating partitions
 */
function generateQuerySuggestions() {
  const queries = [
    // Basic queries to show how to target specific partitions
    {
      title: "Query data from production partition",
      nrql: "SELECT * FROM Log WHERE environment = 'production' LIMIT 100",
    },
    {
      title: "Count logs by service in staging",
      nrql: "SELECT count(*) FROM Log WHERE environment = 'staging' FACET service",
    },
    {
      title: "Error rates by environment",
      nrql: "SELECT count(*) FROM Log WHERE logLevel = 'ERROR' FACET environment",
    },
    {
      title: "Compare response times across environments",
      nrql: "SELECT average(duration) FROM DataPartitionDemo FACET environment",
    },
    {
      title: "Status code distribution by service",
      nrql: "SELECT count(*) FROM DataPartitionDemo FACET statusCode, service WHERE environment = 'production'",
    },
    {
      title: "Log volume trend by environment",
      nrql: "SELECT count(*) FROM Log FACET environment TIMESERIES",
    },
  ];

  return queries;
}

/**
 * Generate sample data partition configurations for the demo
 */
function generatePartitionConfigs() {
  return [
    {
      name: "Production Data",
      description: "Partition containing all production environment data",
      config: {
        rules: [
          {
            attribute: "environment",
            value: "production",
          },
        ],
      },
    },
    {
      name: "Non-Production Data",
      description: "Partition containing staging, development and test data",
      config: {
        rules: [
          {
            attribute: "environment",
            value: "staging",
            operator: "EQUALS",
          },
          {
            attribute: "environment",
            value: "development",
            operator: "EQUALS",
          },
          {
            attribute: "environment",
            value: "testing",
            operator: "EQUALS",
          },
        ],
        rule_logic: "OR",
      },
    },
    {
      name: "Critical Services",
      description:
        "Partition for critical service data across all environments",
      config: {
        rules: [
          {
            attribute: "service",
            value: "api-gateway",
            operator: "EQUALS",
          },
          {
            attribute: "service",
            value: "payment-service",
            operator: "EQUALS",
          },
        ],
        rule_logic: "OR",
      },
    },
    {
      name: "Region: US",
      description: "Partition for all US region data",
      config: {
        rules: [
          {
            attribute: "region",
            value: "us-east-1",
            operator: "EQUALS",
          },
          {
            attribute: "region",
            value: "us-west-2",
            operator: "EQUALS",
          },
        ],
        rule_logic: "OR",
      },
    },
    {
      name: "Error Logs",
      description: "Partition containing only error logs",
      config: {
        rules: [
          {
            attribute: "logLevel",
            value: "ERROR",
            operator: "EQUALS",
          },
        ],
      },
    },
  ];
}

/**
 * Create data partitions using the API
 */
async function createPartitions() {
  console.log("\n🔄 Creating data partitions...");

  const partitionConfigs = generatePartitionConfigs();
  const results = [];

  for (const config of partitionConfigs) {
    try {
      console.log(`Creating partition: ${config.name}`);
      const result = await DataPartitionAPI.createPartition(
        config.name,
        config.description,
        config.config
      );
      results.push({ name: config.name, result });
      console.log(`✅ Created partition: ${config.name}`);
    } catch (error) {
      console.error(
        `❌ Failed to create partition ${config.name}: ${error.message}`
      );

      // If the partition already exists, add it to the results anyway
      if (error.status === 409) {
        results.push({ name: config.name, exists: true });
      }
    }
  }

  return results;
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log("🚀 New Relic Data Partitions Demo");
  console.log("=================================");
  console.log("\nThis script will:");
  console.log(
    "1. Send sample logs and events with attributes suitable for partitioning"
  );
  console.log("2. Create sample data partition configurations");
  console.log("3. Provide NRQL queries to demonstrate partition usage");

  try {
    // Step 1: Generate and send logs
    console.log("\n📤 Sending logs with partitioning attributes...");
    const logs = generateLogEntries();
    console.log(
      `Generated ${logs.length} log entries across ${ENVIRONMENTS.length} environments and ${SERVICES.length} services`
    );

    const logResult = await sendLogs(logs);
    console.log(`✅ ${logResult.message} (${logs.length} logs)`);

    // Step 2: Generate and send events
    console.log("\n📤 Sending custom events with partitioning attributes...");
    const events = generateCustomEvents();
    console.log(
      `Generated ${events.length} custom events across ${ENVIRONMENTS.length} environments and ${SERVICES.length} services`
    );

    const eventResult = await sendEvents(events);
    console.log(`✅ ${eventResult.message} (${events.length} events)`);

    // Step 3: Create data partitions (if API key provided)
    if (USER_API_KEY !== "YOUR_USER_API_KEY") {
      const partitions = await createPartitions();
      console.log("\n✅ Data partitions setup complete");
    } else {
      console.log(
        "\n⚠️ Skipping partition creation. Set your USER_API_KEY to create partitions automatically."
      );
      console.log(
        "You can manually create the partitions in the New Relic UI using the configurations shown below."
      );
    }

    // Step 4: Show partition configurations as examples
    console.log("\n📋 Sample Data Partition Configurations:");
    console.log("--------------------------------------");
    const partitionConfigs = generatePartitionConfigs();
    partitionConfigs.forEach((config, index) => {
      console.log(`\n[Partition ${index + 1}] ${config.name}`);
      console.log(`Description: ${config.description}`);
      console.log("Rules:");

      if (config.config.rules.length === 1) {
        const rule = config.config.rules[0];
        console.log(
          `  - Where ${rule.attribute} ${rule.operator || "equals"} '${
            rule.value
          }'`
        );
      } else {
        config.config.rules.forEach((rule) => {
          console.log(
            `  - Where ${rule.attribute} ${rule.operator || "equals"} '${
              rule.value
            }'`
          );
        });
        console.log(
          `  - Combined with ${config.config.rule_logic || "AND"} logic`
        );
      }
    });

    // Step 5: Show NRQL queries for working with partitions
    console.log("\n🔍 Example NRQL Queries for Data Partitions:");
    console.log("-------------------------------------------");
    const queries = generateQuerySuggestions();
    queries.forEach((query) => {
      console.log(`\n${query.title}:`);
      console.log(`${query.nrql}`);
    });

    // Step 6: Next steps guidance
    console.log("\n🎯 Next Steps in New Relic UI:");
    console.log("----------------------------");
    console.log(
      "1. Go to the New Relic One UI > Data Management > Data Partitions"
    );
    console.log("2. Create partitions based on the configurations shown above");
    console.log("3. View the data using the example NRQL queries");
    console.log(
      "4. Analyze query performance differences with and without partitions"
    );
    console.log("5. Set up data retention policies per partition");

    console.log("\n✨ Demo completed successfully!");
  } catch (error) {
    console.error(`❌ Error during demo: ${error.message}`);
    if (error.status) {
      console.error(`Status code: ${error.status}`);
    }
  }
}

// Run the demo
runDemo();
