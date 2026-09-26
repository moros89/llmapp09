#!/usr/bin/env bash
# Run the full DeepEval suite locally (same as CI). Requires backend on :8080.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$(dirname "$0")"

export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-https://ollama.com}"

if ! curl -sf http://localhost:8080/api/ai/routes >/dev/null; then
  echo "Starting llm-multiroute via docker compose..."
  (cd "$ROOT" && docker compose up -d llm-multiroute)
  for i in $(seq 1 30); do
    curl -sf http://localhost:8080/api/ai/routes >/dev/null && break
    sleep 2
  done
fi

python -m pip install -q -r requirements.txt
deepeval set-ollama \
  --model=deepseek-v4.1-flash \
  --base-url="$OLLAMA_BASE_URL" \
  --save=dotenv

rm -rf .deepeval
deepeval test run \
  test_classify.py \
  test_sentiment.py \
  test_summarize.py \
  test_intent.py \
  -v
