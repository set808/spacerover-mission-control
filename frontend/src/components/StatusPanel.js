import React from "react";

const StatusPanel = ({ title, data }) => {
  return (
    <div className="status-panel">
      <h2>{title}</h2>
      <div className="status-content">
        {Object.entries(data || {}).map(([key, value]) => (
          <div className="status-item" key={key}>
            <span className="status-label">{key}: </span>
            <span className="status-value">{value}</span>
          </div>
        ))}
        {(!data || Object.keys(data).length === 0) && (
          <p>No status data available</p>
        )}
      </div>
    </div>
  );
};

export default StatusPanel;
