# Hosted Snapshot image tests

1. Open `01-readable.md`, create a Hosted Snapshot, and check the images, animations, and SVG in a browser without the extension.
2. Open `02-missing.md` and check the missing-image warning, cancellation, and the option to continue.
3. Open `03-compression.md` and check the size warning, compression results, confirmation step, and unchanged original file.
4. Open Share on the first document, then change an image. Check that Markside asks you to confirm again. Select Link Snapshot and check the warning that local images will not be included.
5. As the recipient, add a Review Comment near an image and return it as a Hosted Snapshot. Check that the images and Review are preserved.

These tests require an extension build with this change and a website and upload endpoint with the matching changes. The public website cannot open the new image format until the corresponding website version is deployed, so do not use it to judge the local implementation before then. The absolute `file:` URL was generated on this computer; update it if you move the folder.
