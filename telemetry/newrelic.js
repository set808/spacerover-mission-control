"use strict";

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || "SpaceRover-TelemetryProcessor"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || "",
  logging: {
    level: "info",
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie*",
      "request.headers.x*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie*",
      "response.headers.x*",
    ],
  },
  distributed_tracing: {
    enabled:
      process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED === "true" || true,
  },
};
