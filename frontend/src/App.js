import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import RoverDetail from "./components/RoverDetail";
import MissionControl from "./components/MissionControl";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Settings from "./components/Settings";
import SimulationPanel from "./components/SimulationPanel";
import TelemetryAnalytics from "./components/TelemetryAnalytics";
import NewRelicPanel from "./components/NewRelicPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(
    localStorage.getItem("darkMode") === "true" || false
  );

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  return (
    <ErrorBoundary errorContext={{ location: "App Root" }}>
      <Router>
        <div className={`app ${darkMode ? "dark-mode" : ""}`}>
          <Header
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          <div className="main-container">
            <Sidebar open={sidebarOpen} />
            <main
              className={`content ${!sidebarOpen ? "content-expanded" : ""}`}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <ErrorBoundary errorContext={{ page: "Dashboard" }}>
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/rover/:id"
                  element={
                    <ErrorBoundary errorContext={{ page: "RoverDetail" }}>
                      <RoverDetail />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/mission-control"
                  element={
                    <ErrorBoundary errorContext={{ page: "MissionControl" }}>
                      <MissionControl />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/telemetry"
                  element={
                    <ErrorBoundary
                      errorContext={{ page: "TelemetryAnalytics" }}
                    >
                      <TelemetryAnalytics />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/new-relic"
                  element={
                    <ErrorBoundary errorContext={{ page: "NewRelicPanel" }}>
                      <NewRelicPanel />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ErrorBoundary errorContext={{ page: "Settings" }}>
                      <Settings
                        darkMode={darkMode}
                        toggleDarkMode={toggleDarkMode}
                      />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/simulation"
                  element={
                    <ErrorBoundary errorContext={{ page: "SimulationPanel" }}>
                      <SimulationPanel />
                    </ErrorBoundary>
                  }
                />
              </Routes>
            </main>
          </div>
          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            theme={darkMode ? "dark" : "light"}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
