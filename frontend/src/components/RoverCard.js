// frontend/src/components/RoverCard.js
import React from "react";
import { Link } from "react-router-dom";
import "./RoverCard.css";

const RoverCard = ({ rover, telemetry }) => {
  const getBatteryStatusClass = (level) => {
    if (level < 20) return "battery-critical";
    if (level < 40) return "battery-low";
    if (level < 70) return "battery-medium";
    return "battery-good";
  };

  const formatLastContact = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return date.toLocaleDateString();
  };

  const formatTemperature = (temp) => {
    return `${temp.toFixed(1)}°C`;
  };

  return (
    <div className="rover-card">
      <div className="rover-header">
        <div>
          <h3 className="rover-name">{rover.name}</h3>
          <div className="rover-model">{rover.model}</div>
        </div>
        <span className={`rover-status status-${rover.status}`}>
          {rover.status}
        </span>
      </div>

      <div className="rover-metrics">
        <div className="metric">
          <div className="metric-label">Battery</div>
          <div
            className={`metric-value ${getBatteryStatusClass(
              rover.batteryLevel
            )}`}
          >
            {rover.batteryLevel}%
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Temperature</div>
          <div className="metric-value">
            {formatTemperature(rover.temperatureC)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Last Contact</div>
          <div className="metric-value">
            {formatLastContact(rover.lastContact)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Signal</div>
          <div className="metric-value">
            {telemetry ? `${telemetry.signalStrength}%` : "Unknown"}
          </div>
        </div>
      </div>

      <div className="rover-location">
        <strong>Location:</strong> {rover.location.planet} at{" "}
        {rover.location.coordinates.x.toFixed(2)},{" "}
        {rover.location.coordinates.y.toFixed(2)}
      </div>

      {telemetry && telemetry.errors && telemetry.errors.length > 0 && (
        <div className="rover-alerts">
          <div className="alert-title">Alerts ({telemetry.errors.length})</div>
          <ul className="alert-list">
            {telemetry.errors.slice(0, 2).map((error, index) => (
              <li key={index} className={`alert-item alert-${error.severity}`}>
                {error.message}
              </li>
            ))}
            {telemetry.errors.length > 2 && (
              <li className="alert-item">
                +{telemetry.errors.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="rover-actions">
        <Link to={`/rover/${rover._id}`} className="details-link">
          View Details
        </Link>
        <button className="control-button" disabled={rover.status !== "active"}>
          Control
        </button>
      </div>
    </div>
  );
};

export default RoverCard;
