#!/bin/sh
set -eu

store_url='https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj'
dry_run=false
setup=false

usage() {
  echo "Usage: open-macos.sh [--dry-run] <file.md|file.mdx|file.markdown>" >&2
  echo "       open-macos.sh [--dry-run] --setup" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=true ;;
    --setup) setup=true ;;
    --*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
    *)
      if [ "${file_path+x}" = x ]; then
        echo "Open exactly one Markdown file." >&2
        usage
        exit 2
      fi
      file_path=$1
      ;;
  esac
  shift
done

open_bin=${MARKSIDE_TEST_OPEN_BIN:-open}
chrome_app='Google Chrome'
chrome_bin=${MARKSIDE_TEST_CHROME_BIN:-}
if [ -n "${MARKSIDE_TEST_CHROME_APP:-}" ]; then
  chrome_app=$MARKSIDE_TEST_CHROME_APP
elif [ -d '/Applications/Google Chrome.app' ]; then
  chrome_app='/Applications/Google Chrome.app'
  if [ -z "$chrome_bin" ]; then
    chrome_bin="$chrome_app/Contents/MacOS/Google Chrome"
  fi
elif [ -n "${HOME:-}" ] && [ -d "$HOME/Applications/Google Chrome.app" ]; then
  chrome_app="$HOME/Applications/Google Chrome.app"
  if [ -z "$chrome_bin" ]; then
    chrome_bin="$chrome_app/Contents/MacOS/Google Chrome"
  fi
fi

if [ -z "$chrome_bin" ] || [ ! -x "$chrome_bin" ]; then
  echo "Google Chrome was not found. Install Chrome, then retry /markside." >&2
  exit 1
fi

if [ "$setup" = true ]; then
  if [ "${file_path+x}" = x ]; then
    echo "--setup does not accept a file path." >&2
    exit 2
  fi
  target=$store_url
else
  if [ "${file_path+x}" != x ]; then
    usage
    exit 2
  fi
  if [ ! -f "$file_path" ]; then
    echo "Markdown file not found: $file_path" >&2
    exit 1
  fi
  case "$file_path" in
    *.md|*.mdx|*.markdown) ;;
    *) echo "Markside opens only .md, .mdx, or .markdown files: $file_path" >&2; exit 1 ;;
  esac
  file_dir=$(CDPATH= cd -- "$(dirname -- "$file_path")" && pwd)
  target="file://$file_dir/$(basename -- "$file_path")"
fi

if [ "$dry_run" = true ]; then
  printf 'Would open in Google Chrome: %s\n' "$target"
else
  "$open_bin" -a "$chrome_app"
  "$chrome_bin" --new-tab "$target"
fi
