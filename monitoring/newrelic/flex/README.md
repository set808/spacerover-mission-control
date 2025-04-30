# SpaceRover Mission Monitoring with New Relic Flex

This guide demonstrates how to implement New Relic Flex to monitor mission data from the SpaceRover Mission Control application.

## What is New Relic Flex?

New Relic Flex is a flexible monitoring tool that allows you to:
- Extract metrics from sources not covered by standard New Relic integrations
- Transform data into meaningful metrics before sending to New Relic
- Create custom monitoring focused on your application's unique aspects

## Implementation Overview

This implementation focuses specifically on monitoring mission data from the SpaceRover Mission Control application. We'll:

1. Collect mission data from the Fleet Command Service API
2. Transform raw mission data into meaningful metrics like:
   - Mission status counts (active, completed, suspended, failed)
   - Mission duration in days
   - Objective completion rates
   - Critical objective tracking

## Prerequisites

- New Relic Infrastructure Agent installed
- New Relic Flex integration installed
- Access to the SpaceRover Mission Control application API

## File Placement

For this implementation, you'll need the following files:

1. **SpaceRover Flex Configuration (YAML)**
   ```
   monitoring/newrelic/flex/spacerover-mission-flex.yml
   ```
   To be deployed to: `/etc/newrelic-infra/integrations.d/`

## Installation Steps

1. Create the directory for the Flex configuration:
   ```bash
   sudo mkdir -p /etc/newrelic-infra/integrations.d/
   ```

2. Copy the Flex configuration file:
   ```bash
   sudo cp spacerover-mission-flex.yml /etc/newrelic-infra/integrations.d/
   ```

3. Restart the Infrastructure Agent:
   ```bash
   sudo systemctl restart newrelic-infra
   ```

## Understanding the Configuration

The Flex configuration uses JQ to transform the API response into meaningful metrics:

```yaml
processors:
  - jq:
      active: "if .status == \"active\" then 1 else 0 end"
      completed: "if .status == \"completed\" then 1 else 0 end"
      
      # Calculate mission duration
      mission_duration_days: "..."
      
      # Calculate completion rate
      objectives_completion_rate: "..."
```

These transformations convert API response data into numeric metrics that can be graphed and alerted on.

## Verifying the Integration

To verify the integration is working:

1. Check the Infrastructure Agent logs:
   ```bash
   sudo tail -f /var/log/newrelic-infra/newrelic-infra.log
   ```

2. Look for entries containing "flex" and "mission-stats":
   ```bash
   sudo grep -i "mission-stats" /var/log/newrelic-infra/newrelic-infra.log
   ```

3. Query the data in New Relic:
   ```sql
   SELECT * FROM SpaceRoverMission SINCE 30 MINUTES AGO
   ```

4. Create mission-specific dashboards:
   ```sql
   SELECT sum(active) as 'Active Missions', 
          sum(completed) as 'Completed Missions',
          sum(failed) as 'Failed Missions' 
   FROM SpaceRoverMission
   
   SELECT average(objectives_completion_rate) as 'Avg Completion Rate' 
   FROM SpaceRoverMission WHERE active = 1
   
   SELECT max(mission_duration_days) as 'Longest Mission (days)'
   FROM SpaceRoverMission
   ```

## Sample Queries for Analysis

Here are some useful NRQL queries for analyzing the mission data:

```sql
-- Mission status overview
SELECT sum(active) as 'Active', 
       sum(completed) as 'Completed', 
       sum(suspended) as 'Suspended', 
       sum(failed) as 'Failed' 
FROM SpaceRoverMission

-- Average mission duration by status
SELECT average(mission_duration_days) FROM SpaceRoverMission FACET status

-- Missions with lowest completion rates
SELECT latest(objectives_completion_rate) FROM SpaceRoverMission 
WHERE active = 1 FACET name LIMIT 5
```

## Troubleshooting

If you encounter issues:

1. Check API connectivity:
   ```bash
   curl http://localhost:4000/api/missions
   ```

2. Test the Flex configuration directly:
   ```bash
   sudo /var/db/newrelic-infra/newrelic-integrations/bin/nri-flex --verbose --config_path /etc/newrelic-infra/integrations.d/spacerover-mission-flex.yml
   ```

3. Verify New Relic license key in the Infrastructure agent configuration

## Further Reading

- [New Relic Flex documentation](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/flex-integration-tool-build-your-own-integration/)
- [JQ Processing in Flex](https://github.com/newrelic/nri-flex/blob/master/docs/basics/jq.md)
- [NRQL documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/introduction-nrql-new-relics-query-language/)
