#!/bin/sh
set -eu

launcher=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)/scripts/open-macos.sh
fixture_root=$(mktemp -d)
trap 'rm -rf "$fixture_root"' EXIT

markdown_file="$fixture_root/Review plan β.md"
touch "$markdown_file"
fake_open="$fixture_root/open"
fake_chrome="$fixture_root/chrome"
launch_log="$fixture_root/launch.log"
printf '%s\n' '#!/bin/sh' 'if [ "$1" = "-a" ]; then exit 0; fi' 'exit 99' > "$fake_open"
printf '%s\n' '#!/bin/sh' 'printf "%s\\n" "$@" > "$MARKSIDE_TEST_LOG"' > "$fake_chrome"
chmod +x "$fake_open"
chmod +x "$fake_chrome"

output=$(MARKSIDE_TEST_CHROME_BIN="$fake_chrome" "$launcher" --dry-run "$markdown_file")
case "$output" in
  *"$markdown_file"*) ;;
  *) echo "dry run did not preserve the Markdown path" >&2; exit 1 ;;
esac

MARKSIDE_TEST_OPEN_BIN="$fake_open" MARKSIDE_TEST_CHROME_BIN="$fake_chrome" MARKSIDE_TEST_CHROME_APP='Test Chrome' MARKSIDE_TEST_LOG="$launch_log" "$launcher" "$markdown_file"
grep -Fx -- '--new-tab' "$launch_log" >/dev/null
grep -Fx -- "file://$markdown_file" "$launch_log" >/dev/null

setup_output=$(MARKSIDE_TEST_CHROME_BIN="$fake_chrome" "$launcher" --dry-run --setup)
case "$setup_output" in
  *"chromewebstore.google.com"*) ;;
  *) echo "setup did not target the Chrome Web Store" >&2; exit 1 ;;
esac

unsupported_file="$fixture_root/notes.MD"
touch "$unsupported_file"
if MARKSIDE_TEST_CHROME_BIN="$fake_chrome" "$launcher" --dry-run "$unsupported_file" >/dev/null 2>&1; then
  echo "uppercase Markdown extension was accepted" >&2
  exit 1
fi

if MARKSIDE_TEST_CHROME_BIN="$fake_chrome" "$launcher" --dry-run "$fixture_root/missing.md" >/dev/null 2>&1; then
  echo "missing file was accepted" >&2
  exit 1
fi

if MARKSIDE_TEST_CHROME_BIN="$fixture_root/missing-chrome" "$launcher" --dry-run "$markdown_file" >/dev/null 2>&1; then
  echo "missing Chrome application was accepted" >&2
  exit 1
fi
