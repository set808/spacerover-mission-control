import React from "react";

const LoadingSpinner = ({ message }) => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>{message || "Loading..."}</p>
    </div>
  );
};

export default LoadingSpinner;
