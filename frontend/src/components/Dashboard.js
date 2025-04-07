// frontend/src/components/Dashboard.js - Main dashboard component

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import RoverCard from "./RoverCard";
import TelemetrySummary from "./TelemetrySummary";
import StatusPanel from "./StatusPanel";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";
import "./Dashboard.css";

const Dashboard = () => {
  const [rovers, setRovers] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const fetchData = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

      const roversResponse = await axios.get(`${API_URL}/api/rovers`);
      setRovers(roversResponse.data);

      const telemetryResponse = await axios.get(
        `${API_URL}/api/telemetry/latest`
      );

      if (telemetryResponse.data.data) {
        setLatestTelemetry(telemetryResponse.data.data);
      } else if (Array.isArray(telemetryResponse.data)) {
        setLatestTelemetry(telemetryResponse.data);
      } else {
        setLatestTelemetry([]);
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
      setLoading(false);
      toast.error("Error loading dashboard data");
    }
  };

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const handleRefreshIntervalChange = (event) => {
    const newInterval = parseInt(event.target.value);
    setRefreshInterval(newInterval);
    toast.info(`Dashboard will refresh every ${newInterval / 1000} seconds`);
  };

  const roverStatuses = rovers.reduce((acc, rover) => {
    acc[rover.status] = (acc[rover.status] || 0) + 1;
    return acc;
  }, {});

  const criticalRovers = rovers.filter(
    (rover) => rover.status === "critical" || rover.batteryLevel < 20
  );

  if (loading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>SpaceRover Mission Control</h1>
        <div className="dashboard-controls">
          <button onClick={fetchData} className="refresh-button">
            Refresh Data
          </button>
          <select
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            className="refresh-select"
          >
            <option value={5000}>Refresh: 5s</option>
            <option value={15000}>Refresh: 15s</option>
            <option value={30000}>Refresh: 30s</option>
            <option value={60000}>Refresh: 1m</option>
            <option value={300000}>Refresh: 5m</option>
          </select>
        </div>
      </div>

      <div className="dashboard-stats">
        <StatusPanel title="Fleet Status" data={roverStatuses} />
        <TelemetrySummary telemetry={latestTelemetry} />
      </div>

      {criticalRovers.length > 0 && (
        <div className="alert-panel">
          <h2>⚠️ Attention Required</h2>
          <ul>
            {criticalRovers.map((rover) => (
              <li key={rover._id}>
                <Link to={`/rover/${rover._id}`}>
                  {rover.name} -{" "}
                  {rover.status === "critical"
                    ? "Critical Status"
                    : "Low Battery"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Rover Fleet</h2>
      <div className="rover-grid">
        {rovers.map((rover) => (
          <RoverCard
            key={rover._id}
            rover={rover}
            telemetry={
              latestTelemetry.find((t) => t.rover.id === rover._id)
                ?.telemetry || null
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
