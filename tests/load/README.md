# Load Testing for Collab Notes (Y-Websocket + Nginx)

This directory contains a [k6](https://k6.io/) load testing script designed for the Collab Notes architecture.

## Architecture Consideration

- **Auth**: Uses JWT passed via query parameter (`?token=`) for WebSocket connections.
- **Routing**: Nginx routes `/ws/*` to the `websocket-service`.
- **Protocol**: Simulates WebSocket connections. Note that full Yjs binary synchronization simulation is complex in pure JS/k6, so this test focuses on **connection concurrency**, **auth validation**, and **websocket stability**.

## Prerequisites

1. Install k6: https://k6.io/docs/get-started/installation/
2. Ensure the full stack is running (`docker-compose up`).

## Running the Test

### Option 1: Quick Run (Console Output)
Run the script directly from the project root:

```bash
k6 run tests/load/k6-script.js
```

### Option 2: Run & Save Results (Recommended)
Use the provided helper script to run the test and save both a text summary and a JSON metrics file to `tests/load/results/`.

```bash
# Run the Constant Load scenario (Default)
./run-load-test.sh tests/load/scenarios/constant.js

# Run the Ramp Up scenario
./run-load-test.sh tests/load/scenarios/ramp-up.js

# Run the Spike scenario
./run-load-test.sh tests/load/scenarios/spike.js
```

The script will generate:
- `summary_YzYY-MM-DD_HH-MM-SS.txt`: The human-readable summary table.
- `metrics_YYYY-MM-DD_HH-MM-SS.json`: Detailed raw data for external analysis.

## Configuration

Edit the `options` object in `tests/load/k6-script.js`:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp to 100 users
    { duration: '2m', target: 100 },  // Hold for 2 minutes
    { duration: '30s', target: 0 },   // Ramp down
  ],
  // ...
};
```

## Troubleshooting

- **WS Error 1006**: Usually means the server closed the connection (e.g., auth failed, server crashed, or Nginx timeout). Check `docker-compose logs websocket-service`.
- **Auth Errors**: Ensure the `setup()` phase in the script successfully creates a user and gets a token.