import React from "react";

const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <div className="error-display">
      <h3>Error</h3>
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Try Again</button>}
    </div>
  );
};

export default ErrorDisplay;
