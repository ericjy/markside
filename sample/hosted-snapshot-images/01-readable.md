# Hosted Snapshot: image rendering

Use this document to check that recipients can see images in their browser without installing the extension. When creating a Share Link, Hosted Snapshot should be selected by default and the dialog should explain that local images will be encrypted and uploaded.

## Markdown relative path

The PNG chart below should show four green bars.

![Chart with four green bars](./assets/chart.png)

## HTML image

The JPEG chart below is referenced by an HTML `img` element.

<img src="./assets/chart.jpg" alt="HTML image: chart with four green bars" width="480">

## Parent directory

The image below is outside this document's folder and should still be included.

![Landscape photograph in a parent directory](../wiki/sunset.png)

## Absolute file URL

The JPEG below uses an absolute file URL on this computer. Update the path if you move the test folder.

![Chart referenced by an absolute path](file:///Users/eric/Code/markside/sample/hosted-snapshot-images/assets/chart.jpg)

## Animation and SVG

The ball should keep moving in both animations. The SVG should show a green circle and text.

![Moving ball](./assets/motion.gif)

![Moving ball, APNG](./assets/motion.png)

![SVG mark with a green circle](./assets/mark.svg)

## Remote image and local document link

The [local document link](./02-missing.md) is not included in the Snapshot. The remote image below keeps its original URL and may require network access to display.

![Remote image example](https://placehold.co/320x100/png)
