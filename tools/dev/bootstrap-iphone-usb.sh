#!/usr/bin/env bash
set -euo pipefail

red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }

need_brew_msg() {
  red "Homebrew not found."
  echo "Install Homebrew then re-run:"
  echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
}

if ! command -v brew >/dev/null 2>&1; then
  need_brew_msg
  exit 1
fi

green "🔧 Updating Homebrew..."
brew update || true

green "📦 Ensuring usbmuxd + libimobiledevice..."
brew list usbmuxd >/dev/null 2>&1 || brew install usbmuxd
brew list libimobiledevice >/dev/null 2>&1 || brew install libimobiledevice

# iproxy is provided by usbmuxd on modern Homebrew
if ! command -v iproxy >/dev/null 2>&1; then
  yellow "iproxy not found in PATH. Adding /opt/homebrew/bin for Apple Silicon users."

  # Determine shell config file
  SHELL_RC=""
  if [[ -n "${ZDOTDIR:-}" ]] && [[ -f "$ZDOTDIR/.zshrc" ]]; then
    SHELL_RC="$ZDOTDIR/.zshrc"
  elif [[ -f "$HOME/.zshrc" ]]; then
    SHELL_RC="$HOME/.zshrc"
  elif [[ -f "$HOME/.zprofile" ]]; then
    SHELL_RC="$HOME/.zprofile"
  elif [[ -f "$HOME/.bashrc" ]]; then
    SHELL_RC="$HOME/.bashrc"
  fi

  # Add PATH to shell config if not already present
  if [[ -n "$SHELL_RC" ]] && ! grep -q '/opt/homebrew/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="/opt/homebrew/bin:$PATH"' >> "$SHELL_RC"
    yellow "Added PATH to $SHELL_RC. Open a new terminal or run: source $SHELL_RC"
  else
    yellow "Manually add /opt/homebrew/bin to your PATH if on Apple Silicon:"
    echo '  echo '"'"'export PATH="/opt/homebrew/bin:$PATH"'"'"' >> ~/.zshrc'
    echo '  source ~/.zshrc'
  fi

  # Source the config and check again
  if [[ -n "$SHELL_RC" ]] && [[ -f "$SHELL_RC" ]]; then
    # shellcheck disable=SC1090
    source "$SHELL_RC" 2>/dev/null || true
  fi

  if ! command -v iproxy >/dev/null 2>&1; then
    red "iproxy still not in PATH. Close & reopen terminal, then re-run this script."
    exit 1
  fi
fi

green "🚀 Starting usbmuxd service..."
brew services start usbmuxd || true

cat <<'EOF'
✅ Bootstrap complete!

Next steps:
1) Connect your iPhone via USB and tap "Trust This Computer"
2) (Optional) Enable Developer Mode on device:
   Settings → Privacy & Security → Developer Mode → ON
3) Verify environment:
   pnpm doctor:usb
4) Start development:
   Terminal 1: pnpm ios:usb
   Terminal 2: pnpm ios:run-usb

If anything fails, run: pnpm doctor:usb
EOF
