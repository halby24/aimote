#!/usr/bin/env bash
set -euo pipefail

# ローカルAndroid APKビルドスクリプト
# Usage: ./scripts/local-android-build.sh [--release]
#   デフォルト: debug ビルド
#   --release: release ビルド

cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${BOLD}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

BUILD_MODE="--debug"
BUILD_LABEL="debug"
for arg in "$@"; do
  case "$arg" in
    --release) BUILD_MODE=""; BUILD_LABEL="release" ;;
    *) error "不明な引数: $arg"; exit 1 ;;
  esac
done

NDK_VERSION="27.0.12077973"

# ----------------------------------------
# 環境変数チェック
# ----------------------------------------
info "環境変数を確認中..."

# JAVA_HOME: JDK 17 を優先
if [ -z "${JAVA_HOME:-}" ]; then
  if /usr/libexec/java_home -v 17 &>/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
    info "JAVA_HOME を自動設定: $JAVA_HOME"
  else
    error "JAVA_HOME が設定されておらず、JDK 17 も見つかりません。"
    error "setup-android.sh を実行してください: ./scripts/setup-android.sh"
    exit 1
  fi
fi

# ANDROID_HOME
if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    info "ANDROID_HOME を自動設定: $ANDROID_HOME"
  else
    error "ANDROID_HOME が設定されていません。"
    error "setup-android.sh を実行してください: ./scripts/setup-android.sh"
    exit 1
  fi
fi

# NDK_HOME
if [ -z "${NDK_HOME:-}" ]; then
  NDK_PATH="${ANDROID_HOME}/ndk/${NDK_VERSION}"
  if [ -d "$NDK_PATH" ]; then
    export NDK_HOME="$NDK_PATH"
    info "NDK_HOME を自動設定: $NDK_HOME"
  else
    error "NDK ${NDK_VERSION} が見つかりません: $NDK_PATH"
    error "setup-android.sh を実行してください: ./scripts/setup-android.sh"
    exit 1
  fi
fi

echo "  JAVA_HOME:    $JAVA_HOME"
echo "  ANDROID_HOME: $ANDROID_HOME"
echo "  NDK_HOME:     $NDK_HOME"

# Rust Android ターゲット確認
REQUIRED_TARGETS=(
  aarch64-linux-android
  armv7-linux-androideabi
  x86_64-linux-android
  i686-linux-android
)
MISSING_TARGETS=()
for target in "${REQUIRED_TARGETS[@]}"; do
  if ! rustup target list --installed | grep -q "^${target}$"; then
    MISSING_TARGETS+=("$target")
  fi
done
if [ ${#MISSING_TARGETS[@]} -ne 0 ]; then
  error "以下の Rust ターゲットがインストールされていません:"
  for t in "${MISSING_TARGETS[@]}"; do error "  - $t"; done
  error "setup-android.sh を実行してください: ./scripts/setup-android.sh"
  exit 1
fi

# ----------------------------------------
# ビルド
# ----------------------------------------
echo ""
info "=== Android APK (${BUILD_LABEL}) ビルド開始 ==="

info "[1/4] 依存パッケージをインストール中..."
pnpm install --frozen-lockfile

info "[2/4] フロントエンドをビルド中..."
pnpm build

info "[3/4] Tauri Android プロジェクトを初期化中..."
cd apps/desktop-tauri
pnpm tauri android init

info "[4/4] Android APK (${BUILD_LABEL}) をビルド中..."
# shellcheck disable=SC2086
pnpm tauri android build $BUILD_MODE

cd "$(git rev-parse --show-toplevel)"

# ----------------------------------------
# 成果物の表示
# ----------------------------------------
echo ""
APK_DIR="apps/desktop-tauri/src-tauri/gen/android/app/build/outputs/apk"
if [ "$BUILD_LABEL" = "debug" ]; then
  APK_PATTERN="${APK_DIR}/universal/debug/*.apk"
else
  APK_PATTERN="${APK_DIR}/universal/release/*.apk"
fi

echo -e "${BOLD}==== ビルド成果物 ====${RESET}"
# globを展開
shopt -s nullglob
apk_files=($APK_PATTERN)
shopt -u nullglob

if [ ${#apk_files[@]} -eq 0 ]; then
  # サブディレクトリも確認
  shopt -s nullglob
  apk_files=(${APK_DIR}/**/*.apk)
  shopt -u nullglob
fi

if [ ${#apk_files[@]} -gt 0 ]; then
  for apk in "${apk_files[@]}"; do
    success "$apk"
  done
else
  echo "  APK ファイルが見つかりません: ${APK_PATTERN}"
fi

echo ""
echo -e "${GREEN}${BOLD}ビルド完了！${RESET}"
