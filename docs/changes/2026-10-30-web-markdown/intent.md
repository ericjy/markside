---
date: 2026-10-30
status: accepted
interview: grill.md
design: spec.md
---

# Online Markdown preview intent

People looking for a Markdown viewer may expect it to render files on the web. Markside currently leaves those files as plain text, which can make it appear not to work. Support read-only preview of raw Markdown from arbitrary websites, including GitHub and GitLab raw links, without requiring all users to grant website access.

Users can preview the current file once or opt into automatic preview across websites. The permission prompt and browser restrictions must be tested; downloads and resources blocked by a website may not work. Already-rendered repository pages remain unchanged.
