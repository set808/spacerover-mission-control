import React from "react";

const TelemetrySummary = ({ telemetry }) => {
  return (
    <div className="telemetry-summary">
      <h2>Telemetry Summary</h2>
      <div className="telemetry-content">
        {telemetry && telemetry.length > 0 ? (
          <div className="telemetry-stats">
            <div className="telemetry-stat">
              <span className="stat-label">Active Rovers: </span>
              <span className="stat-value">{telemetry.length}</span>
            </div>
            <div className="telemetry-stat">
              <span className="stat-label">Avg. Battery: </span>
              <span className="stat-value">
                {Math.round(
                  telemetry.reduce(
                    (acc, t) => acc + (t.telemetry?.batteryLevel || 0),
                    0
                  ) / telemetry.length
                )}
                %
              </span>
            </div>
            <div className="telemetry-stat">
              <span className="stat-label">Avg. Signal: </span>
              <span className="stat-value">
                {Math.round(
                  telemetry.reduce(
                    (acc, t) => acc + (t.telemetry?.signalStrength || 0),
                    0
                  ) / telemetry.length
                )}
                %
              </span>
            </div>
          </div>
        ) : (
          <p>No telemetry data available</p>
        )}
      </div>
    </div>
  );
};

export default TelemetrySummary;
