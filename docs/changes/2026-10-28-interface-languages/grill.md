# Interface languages

The interview took place in chat on 2026-10-28. The user asked about languages
after investigating installations and trying Markside in Edge.

## Q1. How much of the interface should be translated?

> **Decision:** Translate the whole interface, not just first-run guidance.
> The user asked for a complete review after translation.

## Q2. Which languages should be supported?

> **Decision:** English, Simplified Chinese, Traditional Chinese, Korean,
> Japanese, and Spanish. Traditional Chinese uses appropriate local wording,
> not just converted characters.

## Q3. How is the language chosen?

> **Decision:** Follow the browser interface language and fall back to English
> for unsupported languages. The user approved the six-language proposal.

## Q4. What should happen to document and agent content?

> **Decision:** User-authored Markdown is not translated. Localizing interface
> labels must not change Review data or the meaning of instructions sent to an
> agent. The user approved the complete-interface proposal with this boundary.

## Q5. How should this be validated?

> **Decision:** Check the complete interface after translation. Cover labels,
> dialogs, errors and accessibility text, including interpolation and language
> fallback, and run the existing checks.
