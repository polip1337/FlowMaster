# Unlock Simulator

Standalone CLI tool for estimating full-run unlock time on arbitrary layouts (`nodes.js` style).

## What it does

- Loads `NODE_DEFINITIONS`, `NODE_EDGES`, and `PROJECTION_LINKS` from a layout file.
- Simulates tick-by-tick unlock progression with current mechanics:
  - generation
  - edge transfer
  - projection transfer
  - resonance / surge / earth penalties
  - unlock bonuses
- Runs 3 strategy families:
  1. `cheapest` - always target cheapest currently available node
  2. `expensive` - always target most expensive currently available node
  3. `random` - random currently available node

## Usage

```bash
node tools/unlock-simulator.js --layout nodes.js
```

Options:

- `--layout <path>`: layout file path (default: `nodes.js`)
- `--strategies cheapest,expensive,random`: comma-separated list
- `--random-runs <n>`: number of random strategy runs (default: `50`)
- `--max-ticks <n>`: stop each run after this many ticks (default: `50000000`)
- `--seed <n>`: RNG seed for reproducible random runs
- `--json`: emit machine-readable JSON output
- By default, each simulator execution writes a single consolidated log file:
  - `tools/sim-logs/<timestamp>/execution-log.json`
  - Includes all strategies, runs, logs, and unlock events for that execution

## Extending mechanics

The simulator is intentionally split into:

- `UnlockSimulator` (routing, strategy selection, run orchestration)
- `CultivationMechanics` (tick mechanics and bonus math)

To add future mechanics, extend/replace `CultivationMechanics` and pass it into `UnlockSimulator`.
