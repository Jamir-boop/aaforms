# aaforms — Agent Context

Static HTML forms that serve as Automation Anywhere **recorder capture-training targets** — each
`case-*.html` stresses a capture edge case (JS-built DOM, non-`<input>` fields, no selectors,
nested iframes). Published as a static GitHub Pages site at
https://jamir-boop.github.io/aaforms/. Used by the **better-recorder** project as its live test site.

## Central Knowledge Base

Shared AA knowledge: `<AA_KB_ROOT>`. Resolve environment variable; fallback: sibling `..\aa-kb`.

- Start: `<AA_KB_ROOT>\README.md` → `<AA_KB_ROOT>\projects\better-recorder.md` (aaforms = recorder test fixture).
- Never bulk-load `<AA_KB_ROOT>\artifacts\` (~50 GB).
- Updates: `<AA_KB_ROOT>\UPDATE.md`.
- Diffs: compare by default. Ingest requires explicit approval.
