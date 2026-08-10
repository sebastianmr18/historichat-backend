#!/usr/bin/env sh
set -eu

MODE="${1:-all}"
CHARACTER_ID="darwin"

# GLOBAL EXECUTION (DISABLED)
# If you ever need to run every character, the old pattern was:
# for d in testing/inputs/characters/*; do
#   [ -d "$d" ] || continue
#   character=$(basename "$d")
#   tsx src/scripts/eval-character-<phase>.ts --character "$character"
# done
#
# This wrapper intentionally does NOT run Darwin or any other character.

run_character() {
  character_id="$1"
  phase="$2"

  echo "[functional:${phase}] running for ${character_id}"

  case "$phase" in
    retrieval)
      tsx src/scripts/eval-character-retrieval.ts --character "$character_id"
      ;;
    generation)
      tsx src/scripts/eval-character-generation.ts --character "$character_id"
      tsx src/scripts/eval-character-generation.ts --character "$character_id" --mode debate
      tsx src/scripts/eval-character-generation.ts --character "$character_id" --mode call
      ;;
    role)
      tsx src/scripts/eval-character-role-consistency.ts --character "$character_id"
      tsx src/scripts/eval-character-role-consistency.ts --character "$character_id" --mode debate
      tsx src/scripts/eval-character-role-consistency.ts --character "$character_id" --mode call
      ;;
    multiturn)
      tsx src/scripts/eval-character-multiturn.ts --character "$character_id"
      tsx src/scripts/eval-character-multiturn.ts --character "$character_id" --mode debate
      tsx src/scripts/eval-character-multiturn.ts --character "$character_id" --mode call
      ;;
    robustness)
      tsx src/scripts/eval-character-robustness.ts --character "$character_id"
      tsx src/scripts/eval-character-robustness.ts --character "$character_id" --mode debate
      tsx src/scripts/eval-character-robustness.ts --character "$character_id" --mode call
      ;;
    ux)
      tsx src/scripts/eval-character-ux.ts --character "$character_id"
      tsx src/scripts/eval-character-ux.ts --character "$character_id" --mode debate
      tsx src/scripts/eval-character-ux.ts --character "$character_id" --mode call
      ;;
    all)
      run_character "$character_id" retrieval
      run_character "$character_id" generation
      run_character "$character_id" role
      run_character "$character_id" multiturn
      run_character "$character_id" robustness
      run_character "$character_id" ux
      ;;
    *)
      echo "Unknown phase: $phase" >&2
      exit 1
      ;;
  esac
}

run_character "$CHARACTER_ID" "$MODE"
