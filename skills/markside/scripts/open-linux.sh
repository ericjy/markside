#!/bin/sh
set -eu

store_url='https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj'
dry_run=false
setup=false

usage() {
  echo "Usage: open-linux.sh [--dry-run] <file.md|file.mdx|file.markdown>" >&2
  echo "       open-linux.sh [--dry-run] --setup" >&2
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

if { [ "$dry_run" = true ] || [ "${MARKSIDE_TEST_LAUNCH:-}" = 1 ]; } && [ -n "${MARKSIDE_TEST_CHROME_BIN:-}" ]; then
  chrome_bin=$MARKSIDE_TEST_CHROME_BIN
  if [ ! -x "$chrome_bin" ]; then
    echo "Google Chrome executable not found: $chrome_bin" >&2
    exit 1
  fi
else
  chrome_bin=''
  for candidate in google-chrome google-chrome-stable; do
    if command -v "$candidate" >/dev/null 2>&1; then
      chrome_bin=$(command -v "$candidate")
      break
    fi
  done
  if [ -z "$chrome_bin" ]; then
    echo "Google Chrome was not found. Install Chrome, then retry /markside." >&2
    exit 1
  fi
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
  target="$file_dir/$(basename -- "$file_path")"
fi

if [ "$dry_run" = true ]; then
  printf 'Would open in Google Chrome: %s\n' "$target"
else
  nohup "$chrome_bin" --new-tab "$target" >/dev/null 2>&1 &
fi
