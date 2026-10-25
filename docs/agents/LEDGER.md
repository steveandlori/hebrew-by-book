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
| 2026-10-23 | Write cards unlock after 2 in-place views (was 3 days stable) | Steve → coordinator | done |
| 2026-10-23 | Write unlock threshold as a setting (1/2/3/5/Off, default 2) | Steve → coordinator | done |
| 2026-10-23 | Haktuvim chapter link (audio) in Read | Steve → coordinator | done; Ruth 3 checked in browser |
| 2026-10-23 | Meet stars bunched at the end (counted finished cards); now count clean recalls | Steve → coordinator | done |
| 2026-10-23 | Handoff notes copied to josie-stats/docs/handoff/ (uncommitted there) | Steve → coordinator | done |
| 2026-10-23 | Board updated with the day; Steve tried Write the Hebrew: "that worked well too" | Steve → coordinator | done |
| 2026-10-23 | josie-stats handoff: stars kept across reload (carryMeet), screen-reader announcements, forced-colors, CLEAN_RECALLS test, method wording, QA server hygiene | coordinator | done; js 72; Playwright reload mid-Meet keeps 2 stars, reaches 5 |
| 2026-10-23 | Review 2: code (11 findings, 5 should-fix) + QA (FIX FIRST: F1-F4) | general-purpose ×2 | reports in docs/review/code-2.md, qa-2.md |
| 2026-10-23 | Fixes: write verse choice + no k/q (C2-1/2, F4), hint order (C2-3), pad fits ink (C2-4, F1), Off mid-card (C2-5, F3), carryMeet growth (C2-7), maqqef (C2-8), writeForm per card (C2-9), keys with pad open (C2-11), day-start stages (F2), comments (C2-6) | coordinator | js 74; Playwright checks of F1/F2/F3/C2-11 |
| 2026-10-23 | Notes for josie-stats part 2 (pad fit, keys, day-start, carryMeet) copied to its docs/handoff | coordinator | done |
| 2026-10-23 | Confirmation pass: code (9 fixed, 2 accepted; new C2-12..14 minor) + QA (SHIP; new F5 minor) | general-purpose ×2 | appended to code-2.md, qa-2.md |
| 2026-10-23 | Fixed C2-12 (clamp pad points), C2-13 (asked blank marked), C2-14 (comment: growth recount), F5 (same spelling counts as giving the answer away) | coordinator | js 74; two-blank card checked in browser; josie note addendum |
| 2026-10-24 | Learn 5 new words button (Steve); Study 10 more is review only; a finished Meet round stays finished, extra words get their own | coordinator | js 75 |
| 2026-10-24 | Cards rotate through a word's verses at each review (Steve: "same verse"); test covers every rotated place for Write's no-giveaway rule | coordinator | js 76 |
| 2026-10-24 | Browser check (Playwright reconnected): Learn 5 new words gives a fresh Meet round, stars 0→5 evenly over 30 cards; Study 10 more adds no new cards; verses rotate (אִישׁ 1:1→1:3→1:9). Pools now one place per verse (וַיְהִי 1:1 came twice running) | coordinator | js 77 |
| 2026-10-24 | Write 10 button (Steve): Write the Hebrew cards only, for met words; Learn 5 new words renamed Meet 5 new. Browser at 390 px: buttons wrap, no sideways scroll; Write 10 served 10 write cards | coordinator | js 78 |
| 2026-10-24 | Read link dropped from the finished-day buttons (Steve: the Read tab is always there); 390 px check: three buttons, no sideways scroll | coordinator | js 78 |
