import React from "react";

const Settings = ({ darkMode, toggleDarkMode }) => {
  return (
    <div className="settings">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Display</h2>
        <div className="setting-item">
          <label>
            Dark Mode
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Application</h2>
        <p>Version: 1.0.0</p>
      </div>
    </div>
  );
};

export default Settings;
