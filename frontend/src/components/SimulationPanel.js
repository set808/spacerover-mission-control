// frontend/src/components/SimulationPanel.js - Component for triggering monitoring simulations

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";
import "./SimulationPanel.css";

const SimulationPanel = () => {
  const [simulationStatus, setSimulationStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [memoryLeakSize, setMemoryLeakSize] = useState(1000);
  const [memoryLeakInterval, setMemoryLeakInterval] = useState(1000);
  const [cpuLoadIntensity, setCpuLoadIntensity] = useState(50);
  const [cpuLoadDuration, setCpuLoadDuration] = useState(60);
  const [slowQueryDelay, setSlowQueryDelay] = useState(2000);
  const [errorRate, setErrorRate] = useState(10);
  const [logStormRate, setLogStormRate] = useState(100);
  const [logStormSeverity, setLogStormSeverity] = useState("all");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/simulation/status`
      );
      setSimulationStatus(response.data.status);
      setError(null);
    } catch (err) {
      console.error("Error fetching simulation status:", err);
      setError(
        "Failed to load simulation status. Please check if simulation endpoints are enabled."
      );
      toast.error("Error loading simulation status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleMemoryLeak = async (action) => {
    try {
      if (action === "start") {
        await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:4000"
          }/api/simulation/memory-leak/start`,
          null,
          { params: { size: memoryLeakSize, interval: memoryLeakInterval } }
        );
        toast.warning("Memory leak simulation started");
      } else {
        await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:4000"
          }/api/simulation/memory-leak/stop`
        );
        toast.success("Memory leak simulation stopped");
      }
      fetchStatus();
    } catch (err) {
      console.error(`Error ${action}ing memory leak simulation:`, err);
      toast.error(`Failed to ${action} memory leak simulation`);
    }
  };

  const handleCpuLoad = async (action) => {
    try {
      if (action === "start") {
        await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:4000"
          }/api/simulation/cpu-load/start`,
          null,
          { params: { intensity: cpuLoadIntensity, duration: cpuLoadDuration } }
        );
        toast.warning("CPU load simulation started");
      } else {
        await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:4000"
          }/api/simulation/cpu-load/stop`
        );
        toast.success("CPU load simulation stopped");
      }
      fetchStatus();
    } catch (err) {
      console.error(`Error ${action}ing CPU load simulation:`, err);
      toast.error(`Failed to ${action} CPU load simulation`);
    }
  };

  const handleSlowQuery = async (action) => {
    try {
      await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/simulation/slow-query/${action}`,
        null,
        { params: { delay: slowQueryDelay } }
      );
      toast[action === "start" ? "warning" : "success"](
        `Slow query simulation ${action}ed`
      );
      fetchStatus();
    } catch (err) {
      console.error(`Error ${action}ing slow query simulation:`, err);
      toast.error(`Failed to ${action} slow query simulation`);
    }
  };

  const handleErrorRate = async () => {
    try {
      await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/simulation/error-rate`,
        null,
        { params: { rate: errorRate } }
      );
      toast.info(`Error rate set to ${errorRate}%`);
      fetchStatus();
    } catch (err) {
      console.error("Error setting error rate:", err);
      toast.error("Failed to set error rate");
    }
  };

  const handleLogStorm = async (action) => {
    try {
      await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/simulation/log-storm/${action}`,
        null,
        { params: { rate: logStormRate, severity: logStormSeverity } }
      );
      toast[action === "start" ? "warning" : "success"](
        `Log storm simulation ${action}ed`
      );
      fetchStatus();
    } catch (err) {
      console.error(`Error ${action}ing log storm simulation:`, err);
      toast.error(`Failed to ${action} log storm simulation`);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading simulation panel..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchStatus} />;
  }

  return (
    <div className="simulation-panel">
      <h1>Monitoring Simulation Panel</h1>
      <p className="simulation-disclaimer">
        This panel allows instructors to trigger various simulated issues to
        demonstrate New Relic monitoring capabilities. These simulations are for
        educational purposes only.
      </p>

      <div className="simulation-grid">
        {/* Memory Leak Simulation */}
        <div className="simulation-card">
          <h2>Memory Leak Simulation</h2>
          <p>Simulates a memory leak by continuously allocating memory.</p>

          <div className="simulation-status">
            Status:{" "}
            <span
              className={
                simulationStatus.memoryLeak
                  ? "status-active"
                  : "status-inactive"
              }
            >
              {simulationStatus.memoryLeak ? "Active" : "Inactive"}
            </span>
            {simulationStatus.memoryLeak && (
              <span> - Using {simulationStatus.memoryLeakSize}</span>
            )}
          </div>

          <div className="simulation-controls">
            <div className="control-group">
              <label>Size (objects):</label>
              <input
                type="number"
                value={memoryLeakSize}
                onChange={(e) => setMemoryLeakSize(parseInt(e.target.value))}
                min="100"
                max="10000"
              />
            </div>

            <div className="control-group">
              <label>Interval (ms):</label>
              <input
                type="number"
                value={memoryLeakInterval}
                onChange={(e) =>
                  setMemoryLeakInterval(parseInt(e.target.value))
                }
                min="500"
                max="10000"
                step="500"
              />
            </div>

            <div className="button-group">
              <button
                onClick={() => handleMemoryLeak("start")}
                className="start-button"
                disabled={simulationStatus.memoryLeak}
              >
                Start
              </button>
              <button
                onClick={() => handleMemoryLeak("stop")}
                className="stop-button"
                disabled={!simulationStatus.memoryLeak}
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        {/* CPU Load Simulation */}
        <div className="simulation-card">
          <h2>CPU Load Simulation</h2>
          <p>Simulates high CPU usage by performing intensive calculations.</p>

          <div className="simulation-status">
            Status:{" "}
            <span
              className={
                simulationStatus.cpuLoad ? "status-active" : "status-inactive"
              }
            >
              {simulationStatus.cpuLoad ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="simulation-controls">
            <div className="control-group">
              <label>Intensity (%):</label>
              <input
                type="range"
                value={cpuLoadIntensity}
                onChange={(e) => setCpuLoadIntensity(parseInt(e.target.value))}
                min="10"
                max="100"
                step="10"
              />
              <span>{cpuLoadIntensity}%</span>
            </div>

            <div className="control-group">
              <label>Duration (seconds):</label>
              <input
                type="number"
                value={cpuLoadDuration}
                onChange={(e) => setCpuLoadDuration(parseInt(e.target.value))}
                min="0"
                max="300"
              />
              <span>
                {cpuLoadDuration === 0
                  ? "Until stopped"
                  : `${cpuLoadDuration}s`}
              </span>
            </div>

            <div className="button-group">
              <button
                onClick={() => handleCpuLoad("start")}
                className="start-button"
                disabled={simulationStatus.cpuLoad}
              >
                Start
              </button>
              <button
                onClick={() => handleCpuLoad("stop")}
                className="stop-button"
                disabled={!simulationStatus.cpuLoad}
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        {/* Slow Query Simulation */}
        <div className="simulation-card">
          <h2>Slow Query Simulation</h2>
          <p>Simulates slow database queries by adding artificial delays.</p>

          <div className="simulation-status">
            Status:{" "}
            <span
              className={
                simulationStatus.slowQuery ? "status-active" : "status-inactive"
              }
            >
              {simulationStatus.slowQuery ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="simulation-controls">
            <div className="control-group">
              <label>Delay (ms):</label>
              <input
                type="number"
                value={slowQueryDelay}
                onChange={(e) => setSlowQueryDelay(parseInt(e.target.value))}
                min="500"
                max="10000"
                step="500"
              />
            </div>

            <div className="button-group">
              <button
                onClick={() => handleSlowQuery("start")}
                className="start-button"
                disabled={simulationStatus.slowQuery}
              >
                Start
              </button>
              <button
                onClick={() => handleSlowQuery("stop")}
                className="stop-button"
                disabled={!simulationStatus.slowQuery}
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        {/* Error Rate Simulation */}
        <div className="simulation-card">
          <h2>Error Rate Simulation</h2>
          <p>
            Simulates application errors by randomly returning error responses.
          </p>

          <div className="simulation-status">
            Status:{" "}
            <span
              className={
                simulationStatus.errorRate > 0
                  ? "status-active"
                  : "status-inactive"
              }
            >
              {simulationStatus.errorRate > 0
                ? `${simulationStatus.errorRate}% Error Rate`
                : "Inactive"}
            </span>
          </div>

          <div className="simulation-controls">
            <div className="control-group">
              <label>Error Rate (%):</label>
              <input
                type="range"
                value={errorRate}
                onChange={(e) => setErrorRate(parseInt(e.target.value))}
                min="0"
                max="100"
                step="5"
              />
              <span>{errorRate}%</span>
            </div>

            <div className="button-group">
              <button onClick={handleErrorRate} className="apply-button">
                Apply
              </button>
              <button
                onClick={() => {
                  setErrorRate(0);
                  setTimeout(handleErrorRate, 0);
                }}
                className="reset-button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Log Storm Simulation */}
        <div className="simulation-card">
          <h2>Log Storm Simulation</h2>
          <p>
            Simulates a high volume of log messages at various severity levels.
          </p>

          <div className="simulation-status">
            Status:{" "}
            <span
              className={
                simulationStatus.logStorm ? "status-active" : "status-inactive"
              }
            >
              {simulationStatus.logStorm ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="simulation-controls">
            <div className="control-group">
              <label>Rate (logs/second):</label>
              <input
                type="number"
                value={logStormRate}
                onChange={(e) => setLogStormRate(parseInt(e.target.value))}
                min="10"
                max="1000"
                step="10"
              />
            </div>

            <div className="control-group">
              <label>Severity:</label>
              <select
                value={logStormSeverity}
                onChange={(e) => setLogStormSeverity(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="info">Info Only</option>
                <option value="warn">Warning Only</option>
                <option value="error">Error Only</option>
              </select>
            </div>

            <div className="button-group">
              <button
                onClick={() => handleLogStorm("start")}
                className="start-button"
                disabled={simulationStatus.logStorm}
              >
                Start
              </button>
              <button
                onClick={() => handleLogStorm("stop")}
                className="stop-button"
                disabled={!simulationStatus.logStorm}
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={fetchStatus} className="refresh-button">
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default SimulationPanel;
