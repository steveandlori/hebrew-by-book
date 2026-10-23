# Ledger (recovery map for agents; trust this and git log over memory)

| When | What | Who | Result |
| --- | --- | --- | --- |
| 2026-10-22 | Pipeline + app first slice | coordinator (Opus) | commits fcb2b11, 464859e, 205a251, 043f0ee |
| 2026-10-22 | Content review A, cited sources | general-purpose, sonnet | docs/review/content-A.md: 3 MUST, 10 SHOULD, 8 MINOR |
| 2026-10-22 | Content review B, independent sources (BDB via Sefaria, GKC) | general-purpose, opus | docs/review/content-B.md: 5 MUST, 34 SHOULD, 20 MINOR |
| 2026-10-22 | Fresh code review | general-purpose, sonnet | docs/review/code-1.md: 0 MUST, 6 SHOULD, 11 MINOR |
| 2026-10-22 | Fix pass over all three | coordinator | commit 9f3fa4d: affix bug, counts, overrides (~60, each with BDB source), merges, kq note, renderer extracted + tested, session reset |
| 2026-10-22 | Confirmation passes A and B | resumed reviewers | appending "## Confirmation pass" to their reports (running) |
| 2026-10-22 | QA with written plan | general-purpose, sonnet | brief docs/agents/brief-qa.md → docs/review/qa-1.md (running) |

Not applied on purpose (logged in STATUS.md): B-G30 (כִּי אִם sense unverified), seven B-G45 items BDB did not confirm,
B-K3 (3:14 qere holam kept as in source).

Next: fix QA findings → publish (repo + Pages) → update board, STATUS → register board with Steve's project browser.

## Steve's first feedback (2026-10-22, evening)

| Date | Step | Who | State |
| --- | --- | --- | --- |
| 2026-10-22 | English per word (pipeline/english.py) + look-alikes; sheet/card layout: English, brief line, Full parse folded | coordinator | done, tests 48 py / 61 js |
| 2026-10-22 | Renderings review | general-purpose | docs/review/renderings-1.md: 8 must / 23 should / 12 minor; applied; confirmation pass: all must fixed, 22/23 should (08Mjg then trimmed) |
| 2026-10-22 | Publish | coordinator | pushed to main; Pages |

Declined on purpose: 08G2d partitive (QUESTIONABLE), 08rWk עַד אִם, 08BYa there(ward), comparative מִן note.

## Steve's second feedback (2026-10-23)

| Date | Step | Who | State |
| --- | --- | --- | --- |
| 2026-10-23 | הוּא/הִיא split (`_splits`, H1931f) + notes | coordinator | done, test added (50 py) |
| 2026-10-23 | Pad: vector ink redrawn per surface (no compounding shrink) | coordinator | done, Playwright round trip ×3 + hint: full-screen ink same size each time |
| 2026-10-23 | Feature ideas: Meet stars; write-the-Hebrew cards | Steve | approved both; Read fill-in-the-blank declined for now; stars gold with an outline |
| 2026-10-23 | Meet stars + Which-word spark; Write the Hebrew cards + setting | coordinator | done, js 67 / py 50; Playwright: bursts 1-5 of 5, write card front/hints/back at 390px, both settings, no console errors |
