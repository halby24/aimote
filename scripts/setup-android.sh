#!/usr/bin/env bash
set -euo pipefail

# ローカルAndroidビルド環境セットアップスクリプト (macOS)
# Usage: ./scripts/setup-android.sh

cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

NDK_VERSION="27.0.12077973"
ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

info()    { echo -e "${BOLD}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ----------------------------------------
# 1. Homebrew チェック
# ----------------------------------------
info "Homebrew を確認中..."
if ! command -v brew &>/dev/null; then
  error "Homebrew が見つかりません。https://brew.sh からインストールしてください。"
  exit 1
fi
success "Homebrew: $(brew --version | head -1)"

# ----------------------------------------
# 2. JDK 17 チェック / インストール
# ----------------------------------------
info "JDK 17 を確認中..."
if /usr/libexec/java_home -v 17 &>/dev/null 2>&1; then
  JAVA_HOME_17="$(/usr/libexec/java_home -v 17)"
  success "JDK 17: $JAVA_HOME_17"
else
  info "JDK 17 (Temurin) をインストール中..."
  brew install --cask temurin@17
  JAVA_HOME_17="$(/usr/libexec/java_home -v 17)"
  success "JDK 17 インストール完了: $JAVA_HOME_17"
fi

# ----------------------------------------
# 3. Android Command Line Tools チェック / インストール
# ----------------------------------------
info "Android SDK を確認中..."
SDKMANAGER=""

# Android Studio 経由でインストール済みの場合
if [ -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
  SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  success "Android SDK (Android Studio): $ANDROID_SDK_ROOT"
# Homebrew 経由でインストール済みの場合
elif command -v sdkmanager &>/dev/null; then
  SDKMANAGER="$(which sdkmanager)"
  success "Android SDK (Homebrew): $(dirname "$(dirname "$(dirname "$SDKMANAGER")")")"
else
  info "Android Command Line Tools をインストール中..."
  brew install --cask android-commandlinetools
  # Homebrew がインストールするパスを探す
  CMDLINE_TOOLS_PATH="$(brew --prefix)/share/android-commandlinetools"
  if [ -f "$CMDLINE_TOOLS_PATH/cmdline-tools/latest/bin/sdkmanager" ]; then
    SDKMANAGER="$CMDLINE_TOOLS_PATH/cmdline-tools/latest/bin/sdkmanager"
    ANDROID_SDK_ROOT="$CMDLINE_TOOLS_PATH"
  else
    # フォールバック: Android Studio のデフォルトパス
    ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
    SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
    warn "sdkmanager が見つかりません。Android Studio のインストールも検討してください。"
    warn "  brew install --cask android-studio"
  fi
  success "Android Command Line Tools インストール完了"
fi

# ----------------------------------------
# 4. Android NDK インストール
# ----------------------------------------
info "Android NDK ${NDK_VERSION} を確認中..."
NDK_PATH="${ANDROID_SDK_ROOT}/ndk/${NDK_VERSION}"

if [ -d "$NDK_PATH" ]; then
  success "NDK ${NDK_VERSION}: $NDK_PATH"
elif [ -n "$SDKMANAGER" ] && [ -f "$SDKMANAGER" ]; then
  info "NDK ${NDK_VERSION} をインストール中..."
  yes | JAVA_HOME="$JAVA_HOME_17" "$SDKMANAGER" --sdk_root="$ANDROID_SDK_ROOT" "ndk;${NDK_VERSION}"
  success "NDK ${NDK_VERSION} インストール完了"
else
  warn "sdkmanager が利用できません。手動で NDK をインストールしてください:"
  warn "  Android Studio > SDK Manager > SDK Tools > NDK (Side by side) > ${NDK_VERSION}"
fi

# ----------------------------------------
# 5. Rust Android ターゲット追加
# ----------------------------------------
info "Rust Android ターゲットを確認中..."
TARGETS=(
  aarch64-linux-android
  armv7-linux-androideabi
  x86_64-linux-android
  i686-linux-android
)

for target in "${TARGETS[@]}"; do
  if rustup target list --installed | grep -q "^${target}$"; then
    success "Rust target: $target (インストール済み)"
  else
    info "Rust target を追加中: $target"
    rustup target add "$target"
    success "Rust target 追加完了: $target"
  fi
done

# ----------------------------------------
# 6. 環境変数の案内
# ----------------------------------------
echo ""
echo -e "${BOLD}==== 環境変数の設定 ====${RESET}"
echo "以下を ~/.zshrc (または ~/.zprofile) に追加してください:"
echo ""
echo "  export JAVA_HOME=\"$JAVA_HOME_17\""
echo "  export ANDROID_HOME=\"$ANDROID_SDK_ROOT\""
echo "  export NDK_HOME=\"${NDK_PATH}\""
echo "  export PATH=\"\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools\""
echo ""

# 現在のセッションに適用
export JAVA_HOME="$JAVA_HOME_17"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export NDK_HOME="$NDK_PATH"

# ----------------------------------------
# 7. セットアップ確認
# ----------------------------------------
echo -e "${BOLD}==== セットアップ確認 ====${RESET}"
echo "  JAVA_HOME:    $JAVA_HOME"
echo "  ANDROID_HOME: $ANDROID_HOME"
echo "  NDK_HOME:     $NDK_HOME"

echo ""
echo -e "${GREEN}${BOLD}セットアップ完了！${RESET}"
echo "次のステップ: ./scripts/local-android-build.sh"
