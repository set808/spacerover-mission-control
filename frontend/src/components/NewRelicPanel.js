// frontend/src/components/NewRelicPanel.js - Component with instructions for New Relic integration

import React from "react";
import "./NewRelicPanel.css";

const NewRelicPanel = () => {
  return (
    <div className="new-relic-panel">
      <h1>New Relic Integration Guide</h1>

      <div className="nr-section">
        <h2>Overview</h2>
        <p>
          This application is designed to work with New Relic to demonstrate
          advanced monitoring capabilities. Follow the steps below to set up
          your New Relic account and integrate it with the SpaceRover Mission
          Control application.
        </p>
      </div>

      <div className="nr-section">
        <h2>Step 1: Create a New Relic Account</h2>
        <p>
          If you don't already have a New Relic account, sign up for a free
          account at
          <a
            href="https://newrelic.com/signup"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://newrelic.com/signup
          </a>
          .
        </p>
      </div>

      <div className="nr-section">
        <h2>Step 2: Get Your License Key</h2>
        <ol>
          <li>Log in to your New Relic account</li>
          <li>Navigate to the API keys page in your account settings</li>
          <li>Create a new license key or use an existing one</li>
          <li>Copy the license key for use in the next steps</li>
        </ol>
      </div>

      <div className="nr-section">
        <h2>Step 3: Update Environment Variables</h2>
        <p>
          Update the following environment variables in your Docker Compose file
          or .env files:
        </p>
        <pre>
          {`# Backend API
NEW_RELIC_LICENSE_KEY=your_license_key
NEW_RELIC_APP_NAME=SpaceRover-FleetCommand

# Telemetry Service
NEW_RELIC_LICENSE_KEY=your_license_key
NEW_RELIC_APP_NAME=SpaceRover-TelemetryProcessor

# Frontend
REACT_APP_NEW_RELIC_APP_ID=your_browser_app_id
REACT_APP_NEW_RELIC_LICENSE_KEY=your_license_key`}
        </pre>
      </div>

      <div className="nr-section">
        <h2>Step 4: Restart Services</h2>
        <p>After updating the environment variables, restart all services:</p>
        <pre>
          {`# Stop all containers
docker-compose down

# Start all containers with updated environment variables
docker-compose up -d`}
        </pre>
      </div>

      <div className="nr-section">
        <h2>Step 5: Verify Integration</h2>
        <p>
          After restarting the services, verify that data is flowing to New
          Relic:
        </p>
        <ol>
          <li>Log in to your New Relic account</li>
          <li>Navigate to APM & Services</li>
          <li>
            You should see SpaceRover-FleetCommand and
            SpaceRover-TelemetryProcessor services
          </li>
          <li>Navigate to Browser to see frontend monitoring</li>
        </ol>
      </div>

      <div className="nr-section">
        <h2>Course Module Integration</h2>
        <p>
          This application is designed to support the following New Relic course
          modules:
        </p>
        <table className="nr-table">
          <thead>
            <tr>
              <th>Course Module</th>
              <th>Application Component</th>
              <th>Features to Demonstrate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Advanced APM</td>
              <td>Fleet Command Service</td>
              <td>
                <ul>
                  <li>Transaction tracing</li>
                  <li>Custom instrumentation</li>
                  <li>Custom attributes and events</li>
                  <li>Change tracking</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Infrastructure Agent</td>
              <td>Docker containers and host metrics</td>
              <td>
                <ul>
                  <li>Resource utilization monitoring</li>
                  <li>Container metrics</li>
                  <li>Host metrics</li>
                  <li>Alert configuration</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>Logs</td>
              <td>Application-wide logging</td>
              <td>
                <ul>
                  <li>Log ingestion setup</li>
                  <li>Log parsing and formatting</li>
                  <li>Log patterns analysis</li>
                  <li>Integration with APM and Infrastructure</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="nr-section">
        <h2>Using the Simulation Panel</h2>
        <p>
          The Simulation Panel allows you to trigger different scenarios to
          demonstrate New Relic's monitoring capabilities:
        </p>
        <ul>
          <li>
            <strong>Memory Leak:</strong> Demonstrates how New Relic detects and
            alerts on memory issues
          </li>
          <li>
            <strong>CPU Load:</strong> Shows CPU utilization monitoring and
            alerting
          </li>
          <li>
            <strong>Slow Queries:</strong> Highlights database performance
            monitoring
          </li>
          <li>
            <strong>Error Rate:</strong> Demonstrates error tracking and
            alerting
          </li>
          <li>
            <strong>Log Storm:</strong> Shows log management and pattern
            detection
          </li>
        </ul>
        <p>
          Use these simulations in coordination with the course material to
          provide hands-on learning experiences.
        </p>
      </div>
    </div>
  );
};

export default NewRelicPanel;
