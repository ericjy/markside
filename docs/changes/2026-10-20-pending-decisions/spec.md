# Pending decisions after 1.6.0

**Date:** 2026-10-20
**Status:** Historical interview decisions
**Interview:** [Full questions and decisions](grill.md)

These are the decisions recorded at the time of the interview, not a report of
their current implementation or release status.

## HTML diagrams

Review the [HTML diagrams specification](../2026-10-20-html-diagrams/spec.md)
in Markside before committing it, so the user can check the reasons given for
rejected alternatives. Correct the stale raw-HTML description in system design
in the same commit.

HTML diagram frames have an expand control and handle their own interaction.
A whole-diagram Review Comment quotes `[HTML diagram]` and points to the opening
fence's source line. Reload Comparison marks a changed diagram as a whole with
an outline and Changed label; removed diagrams appear as struck-through
placeholders.

## Priorities

Build HTML diagrams before adding other
[diagram engines](../2026-10-19-diagram-engines/spec.md). Keep the engines design
available for future demand. The interview also chose to explain on issue #1
that Vega-style charts can be drawn as HTML diagrams.

[Web Preview](../2026-10-19-web-preview/spec.md) stays Proposed and is deferred
until after HTML diagrams and the release. Mermaid keeps its current appearance
unless someone requests a theme change.

## Release decision

The interview chose to publish the Markside CLI to npm before releasing 1.7.0,
and to describe the agent Review loop as Beta. This archive records that choice;
current release procedures remain in the repository's release documentation.
