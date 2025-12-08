#!/bin/bash

# Ensure the results directory exists
mkdir -p tests/load/results

# Default script if none provided
SCRIPT=${1:-tests/load/k6-script.js}

# Extract scenario name for filename
SCENARIO_NAME=$(basename "$SCRIPT" .js)

# Generate a timestamp for unique filenames
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Define output file paths
SUMMARY_FILE="tests/load/results/${SCENARIO_NAME}_summary_${TIMESTAMP}.txt"
JSON_FILE="tests/load/results/${SCENARIO_NAME}_metrics_${TIMESTAMP}.json"

echo "🚀 Starting k6 Load Test..."
echo "-----------------------------------"
echo "📜 Script: $SCRIPT"
echo "📄 Text Report: $SUMMARY_FILE"
echo "qh Raw Metrics: $JSON_FILE"
echo "-----------------------------------"

# Run k6
if k6 run --out json="$JSON_FILE" "$SCRIPT" > "$SUMMARY_FILE" 2>&1; then
  echo "✅ Test completed successfully!"
  echo "View the summary:"
  echo "cat $SUMMARY_FILE"
else
  echo "❌ Test failed to run."
  echo "Check the error log:"
  echo "cat $SUMMARY_FILE"
  exit 1
fi
