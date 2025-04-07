# SpaceRover Mission Control

A full-stack monitoring sandbox for the "Advanced Full Stack Monitoring Course with New Relic." This application provides a comprehensive environment for learning and demonstrating monitoring concepts including APM, Infrastructure, and Logs.

![SpaceRover Mission Control Banner](docs/images/banner.png)

## 🚀 Application Overview

SpaceRover Mission Control simulates a space agency's mission control center that monitors and controls a fleet of rovers exploring distant planets. The application is designed to demonstrate various monitoring concepts in a practical, engaging way.

### Components

1. **Mission Control Dashboard (Frontend)**: React application for visualizing rover status and mission data
2. **Fleet Command Service (Backend API)**: Node.js/Express service for rover command and mission management
3. **Telemetry Processor (Background Service)**: Worker service for processing incoming rover data
4. **Mission Database**: MongoDB database storing mission and rover information
5. **Simulation Tools**: Configurable tools to generate monitoring scenarios

## 🎓 Educational Features

- **Built-in Monitoring**: Pre-configured for New Relic integration
- **Configurable Issues**: Trigger performance bottlenecks, memory leaks, and errors on demand
- **Structured Logs**: Various log formats and patterns for log monitoring demonstrations
- **Realistic Telemetry**: Simulated rover data that changes over time
- **Progressive Complexity**: Components can be introduced gradually as students progress
- **Complete Documentation**: Each component includes details about monitoring opportunities

## 📊 Monitoring Concepts Demonstrated

| Course Module | Application Component | Learning Opportunities |
|--------------|------------------------|------------------------|
| Advanced APM | Fleet Command Service | Transaction tracing, custom instrumentation, change tracking |
| Infrastructure Agent | Docker containers + Host metrics | Infrastructure monitoring, resource utilization, agent configuration |
| Logs | Application-wide logging | Log parsing, patterns, integration with APM and Infrastructure |

## 🛠 Installation & Setup

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) v14+ (for local development only)
- [New Relic account](https://newrelic.com/signup) (free tier available)

### Quick Start with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/spacerover-mission-control.git
   cd spacerover-mission-control
   ```

2. Create a `.env` file with your New Relic license key:
   ```
   NEW_RELIC_LICENSE_KEY=your_license_key
   ```

3. Start all services:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Mission Control Dashboard: http://localhost:3000
   - Fleet Command API: http://localhost:4000
   - Telemetry Service: http://localhost:6000

### Manual Development Setup

If you prefer to run components individually for development:

1. Start MongoDB:
   ```bash
   docker-compose up -d mongodb
   ```

2. Start the Fleet Command service:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. Start the Telemetry service:
   ```bash
   cd telemetry
   npm install
   npm run dev
   ```

4. Start the frontend application:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 🔍 Using the Application

### Rover Dashboard

The main dashboard shows an overview of all rovers, their status, and telemetry data. From here you can:

- View rover status and health metrics
- Navigate to detailed views for each rover
- See alerts for critical conditions
- Monitor real-time telemetry updates

### Simulation Panel

Use the Simulation Panel to trigger different monitoring scenarios:

- **Memory Leak**: Simulates memory leaks at configurable rates
- **CPU Load**: Generates high CPU usage patterns
- **Slow Queries**: Introduces delays in database operations
- **Error Rate**: Configures random error generation
- **Log Storm**: Creates log entries at different volumes and severities

These scenarios help demonstrate how monitoring tools detect and alert on various issues.

### New Relic Integration

The application includes detailed instructions for connecting to New Relic:

1. Navigate to the "New Relic" tab in the application
2. Follow the step-by-step guide to configure your New Relic account
3. Use the provided dashboards and alert configurations

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                Docker Environment                │
│                                                 │
│  ┌─────────────┐      ┌────────────────────┐    │
│  │   React     │      │  Fleet Command     │    │
│  │  Frontend   │◄────►│  Service (Node.js) │    │
│  └─────────────┘      └────────────────────┘    │
│         ▲                       ▲               │
│         │                       │               │
│         ▼                       ▼               │
│  ┌─────────────┐      ┌────────────────────┐    │
│  │  Telemetry  │      │      MongoDB       │    │
│  │  Processor  │◄────►│                    │    │
│  └─────────────┘      └────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 👨‍🏫 Course Integration

This application is designed to support the "Advanced Full Stack Monitoring Course with New Relic" with specific features for each module:

### Module: Advanced APM
- Custom transaction naming
- Custom metrics and events
- Distributed tracing across services
- Change tracking demonstration

### Module: Infrastructure Agent
- Container monitoring
- Host metrics visualization
- Custom dashboard creation
- Alert configuration

### Module: Logs
- Structured and unstructured logging
- Log pattern identification
- Log correlation with APM data
- Log-based alerting

## 📝 Customization

You can customize various aspects of the application:

### Simulation Settings

Edit `docker-compose.yml` to change default simulation parameters:
```yaml
environment:
  - ENABLE_SIMULATED_ISSUES=true
  - SIMULATION_INTENSITY=medium  # Options: low, medium, high
```

### Adding New Rovers

Use the Fleet Command API to add new rovers:
```bash
curl -X POST http://localhost:4000/api/rovers -H "Content-Type: application/json" -d '{
  "name": "Curiosity II",
  "model": "Explorer 3000",
  "status": "active",
  "location": {
    "coordinates": {"x": 125.32, "y": 78.91},
    "planet": "Mars"
  },
  "capabilities": ["imaging", "sampling", "drilling"]
}'
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- NASA for inspiration on rover operations and telemetry systems
- New Relic for their monitoring platform and educational resources
