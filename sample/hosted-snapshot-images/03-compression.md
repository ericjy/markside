# Hosted Snapshot: size limit and compression

The image below contains deterministic random pixels so the file exceeds the Hosted Snapshot upload limit. Creating a link should show a size warning and offer compression.

After choosing compression, the dialog should show the sizes before and after compression and the paths that changed, then wait for your confirmation. Compression affects only the Snapshot and must not change the original file. The original is about 5.9 MiB; whether the compressed copy fits depends on the browser's encoding result.

![Random-pixel image for testing the size limit](./assets/large-noise.png)

The animations and SVG below check that compression does not convert them into static bitmaps.

![Moving ball](./assets/motion.gif)

![Moving ball, APNG](./assets/motion.png)

![SVG mark with a green circle](./assets/mark.svg)
