#!/usr/bin/env bash
# Render the Chrome Web Store promo tiles and promo cards into assets/
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
src="$root/scripts/store-promo"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

shoot() {
  "$chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=3000 --window-size="$1" \
    --screenshot="$2" "$3" 2>/dev/null
}

shoot 440,280 "$root/assets/store-promo-small-440x280.png" "file://$src/tile.html?size=small"
shoot 1400,560 "$root/assets/store-promo-marquee-1400x560.png" "file://$src/tile.html?size=marquee"

i=1
for card in read review edit navigate share; do
  shoot 1280,800 "$root/assets/screenshots/promo-$i-$card.png" "file://$src/cards.html?card=$card"
  i=$((i + 1))
done
