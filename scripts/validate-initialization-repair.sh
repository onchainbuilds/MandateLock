#!/usr/bin/env bash
# Local Linux sandbox only. No installation, public-chain RPC, credentials or CI activation.
set -euo pipefail
test "$(uname -s)" = Linux || { echo 'UNVERIFIED: supported Linux sandbox required'; exit 1; }
: "${NEAR_SANDBOX_BIN_PATH:?Set the path to an already installed, approved Linux sandbox binary}"
test -x "$NEAR_SANDBOX_BIN_PATH"
export MANDATELOCK_WASM="$(pwd)/artifacts/phase2b-closure-run/evidence/phase2a/mandatelock.wasm"
export MANDATELOCK_INIT_EVIDENCE_DIR="$(pwd)/artifacts/phase4-initialization-repair/sandbox"
echo "3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87  $MANDATELOCK_WASM" | sha256sum --check
mkdir -p "$MANDATELOCK_INIT_EVIDENCE_DIR"
cargo test --manifest-path integration-tests/Cargo.toml --test initialization_repair --locked --offline -- --nocapture 2>&1 | tee "$MANDATELOCK_INIT_EVIDENCE_DIR/runtime.log"
node --input-type=module -e "import {requireRepairRuntimeEvidence} from './testnet/initialization-repair.mjs'; requireRepairRuntimeEvidence(process.env.MANDATELOCK_INIT_EVIDENCE_DIR+'/results.json'); console.log('Six finalized frozen-Wasm initialization scenarios verified');"
