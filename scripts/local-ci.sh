#!/usr/bin/env bash
set -euo pipefail

# ローカルでCIと同等のチェックを実行するスクリプト
# Usage: ./scripts/local-ci.sh [step...]
#   引数なし → 全ステップ実行
#   引数あり → 指定ステップのみ実行 (例: ./scripts/local-ci.sh lint typecheck)

cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

passed=()
failed=()

run_step() {
  local name="$1"
  shift
  echo ""
  echo -e "${BOLD}==== ${name} ====${RESET}"
  if "$@"; then
    passed+=("$name")
    echo -e "${GREEN}✓ ${name} passed${RESET}"
  else
    failed+=("$name")
    echo -e "${RED}✗ ${name} failed${RESET}"
  fi
}

# 実行対象のステップを決定
if [ $# -eq 0 ]; then
  steps=(lint typecheck build test)
else
  steps=("$@")
fi

for step in "${steps[@]}"; do
  case "$step" in
    lint)      run_step "Lint"      pnpm lint ;;
    typecheck) run_step "Typecheck" pnpm typecheck ;;
    build)     run_step "Build"     pnpm build ;;
    test)      run_step "Test"      pnpm test ;;
    *)
      echo -e "${RED}Unknown step: ${step}${RESET}" >&2
      echo "Available steps: lint, typecheck, build, test" >&2
      exit 1
      ;;
  esac
done

# サマリー
echo ""
echo -e "${BOLD}==== Summary ====${RESET}"
for name in "${passed[@]}"; do
  echo -e "  ${GREEN}✓ ${name}${RESET}"
done
for name in "${failed[@]}"; do
  echo -e "  ${RED}✗ ${name}${RESET}"
done

if [ ${#failed[@]} -ne 0 ]; then
  echo ""
  echo -e "${RED}${#failed[@]} step(s) failed.${RESET}"
  exit 1
fi

echo ""
echo -e "${GREEN}All steps passed.${RESET}"
