import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";

const RoverDetail = () => {
  const { id } = useParams();
  const [rover, setRover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoverDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:4000"
          }/api/rovers/${id}`
        );
        setRover(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching rover details:", err);
        setError("Failed to load rover details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoverDetails();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading rover details..." />;
  }

  if (error) {
    return (
      <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
    );
  }

  return (
    <div className="rover-detail">
      <h1>Rover Details</h1>
      {rover ? (
        <div className="rover-info">
          <h2>{rover.name}</h2>
          <p>Model: {rover.model}</p>
          <p>Status: {rover.status}</p>
          <p>Location: {rover.location?.planet}</p>
          <p>Battery Level: {rover.batteryLevel}%</p>
          <p>Last Contact: {new Date(rover.lastContact).toLocaleString()}</p>
        </div>
      ) : (
        <p>No rover information available</p>
      )}
    </div>
  );
};

export default RoverDetail;
