# Open `.md.txt` as Markdown

The problem and design were discussed in chat on 2026-10-28. This record
reconstructs the questions and distinguishes the user's decisions from the
implementation choices made to finish the change.

## Q1. What prompted the change?

The user installed Markside in Edge and found that a file named `.md.txt` did
not open as Markdown. Showing file extensions and removing `.txt` fixed it.
The user asked whether Markside could detect this case and ask to treat it as
Markdown, then approved implementing the proposed approach.

## Q2. What should the prompt do?

> **Decision:** Offer **Open as Markdown** or **Keep as text** for `.md.txt`
> files already opened in Markside. The first choice enables Preview, Source,
> and Split without renaming the file. Keeping the file as text leaves it in
> Source.

The assistant proposed this behavior and the user replied "做吧".

## Q3. What happens to the file on disk?

> **Decision:** Do not automatically rename it. Continue saving to the same
> `.md.txt` file. Other programs will still see a text file.

This was part of the approved proposal.

## Q4. How long does the choice last?

> **Implementation choice:** The choice lasts while the file remains open in
> the current page. Navigating away or reloading asks again. No preference is
> saved, and ordinary `.txt` files are unaffected.

This detail was not discussed explicitly; a temporary choice avoids changing
the interpretation of other files or tabs.
