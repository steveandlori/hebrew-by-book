# Plan review: breaks, backlogs and fading (docs/plans/breaks-plan.md)

Reviewer: Fable 5.1 (adversarial plan review, requested before implementation).
Status: COMPLETE (2026-10-26). Findings were appended as found; the probe used is noted inline (scratchpad `review/probe.mjs`, importing js/scheduler.js by file:// URL).

Severity scale: BLOCKER / SHOULD-FIX / MINOR / QUESTION.
Evidence label: VERIFIED (checked in code or by a probe — how is stated) / REASONED.

## Findings

### P-1 — BLOCKER — "Stop for today" does not stick: `resumeOrStart` refills the queue and a reload rebuilds the whole pile

Scenario: a week away; Monday noon the session has 165 due cards; after the 60th review the interstitial appears and
Steve presses "Stop for today" (the queue is dropped, the wrap-up shows). He taps Read to look at a verse, then Today.
`resumeOrStart` (js/app.js 949–961): same day, queue empty, `done > 0` → `fresh = dueCards()…` → every dropped card is
still due today under day-based due → all 105 go straight back into the queue and `renderStudy` shows the next card.
The soft stop is "shown at most once per day", so no second offer. A reload is worse: `startSession` rebuilds the full
remaining pile, `done` resets to 0, and again no interstitial. The same happens after a "Caught up" wrap-up on a
non-catch-up day with >60 due (the Meet cards and deepen cards return on reload — that one is today's behaviour too).

VERIFIED by reading `resumeOrStart` and `startSession`; the refill has no notion of "declined today".

Amendment: persist the stop (`state.stopped = { day }` or fold it into `state.softStop`) and honour it in both
`resumeOrStart` (no refill, show the wrap-up) and `startSession` (same day + stopped → compose nothing, show the
wrap-up; a new day clears it). Note also that under day-based due the refill in `resumeOrStart` is nearly dead code:
every card due before tomorrow 4 am was already in the session when it was built (new intervals are ≥ 1 day, so
graded cards cannot come due again today; only the requeued step cards could, and they are handled in-session). It
can be removed, or restricted to cards whose `due` is later than the time the session was built. Removing it is the
simplest fix for the refill half of this finding.

### P-2 — BLOCKER — Catch-up blocks the manual override ("Meet 5 new" does nothing) and a reload loses it

Scenario: catch-up day (overdue ≥ 15); Steve reviews 60, takes the soft stop (overdue still ≥ 15), the wrap-up's third
button is "Meet 5 new" ("the manual override", §2). `learnMoreWords` sets `moreWords.n = max(0, met + 5 − newPerDay)` =
0 (nothing met today, newPerDay 10) and calls `startSession({ keepDone: true, newWords: 5 })`. The plan has
`startSession` recompute catch-up and pass `newWords: 0`, so the composer meets nothing: the button rebuilds the same
review queue and no word is met. Even if the plan passes the 5 through, a reload mid-Meet recomputes catch-up →
`newWords: 0`; the words whose recall card was graded continue (`meetFinish`, step cards), the rest of the five vanish
until the backlog is cleared.

VERIFIED: `learnMoreWords` (app.js 301–306) depends on the base allowance (`allowances` = `newPerDay + moreWords −
met`); the research's "Meet 5 new still works as a manual override" needs a mechanism the plan does not give it.

Amendment: define an effective daily number, `catchUp ? 0 : newPerDay`, and use it in `allowances` *and* in
`learnMoreWords` (so that in catch-up `moreWords.n = met + 5`, and `Meet N new` after "Caught up" stores `n = N`).
Then `moreWords` is the override, it survives a reload (it is day-keyed already), and `startSession` needs no special
`newWords` argument beyond today's. Add a unit test: catch-up, press Meet 5 new, reload → five words still allowed.

### P-3 — SHOULD-FIX — Review 10 after a soft stop or an early wrap-up skips the cards he just declined

Scenario: after "Stop for today" the wrap-up offers Review 10. `studyAhead` (app.js 277–285) takes `!isDue` cards,
soonest due. Under day-based due the 105 declined cards are `isDue`, so Review 10 pulls ten cards due *tomorrow* while
105 due-today cards wait. The button's text ("Review 10") and the research's intent ("the rest will come tomorrow") are
both satisfied only if it takes the remaining due cards first.

VERIFIED by reading `studyAhead`; the filter is exactly `!isDue(c.id, at)`.

Amendment: `studyAhead` takes `[...dueCards() not in steps and not queued, ...ahead].slice(0, n)`; with lowest-R
ordering when the backlog is ordered (reuse `riskOf`). The same change makes "Review 10" correct on the "Caught up"
wrap-up of a day where some overdue card was skipped.

### P-4 — SHOULD-FIX — `?debug=away` as written cannot show catch-up: the seeded words are introduced under *today's* key, so the allowance is already 0

Scenario: `?debug=away&days=7` (default 30 words). `debugSeed` grades each Meet card three times through `applyGrade`,
which writes `newIntroduced[todayKey()]`, `sessions[todayKey()]` and the log `at` with `now()`. Shifting only
`due`/`last_review`/log `at` afterwards leaves `newIntroduced[today]` holding 60 card ids → `allowances` gives
`words = max(0, 10 − 30) = 0`. No new words appear whether or not catch-up works, so the link proves nothing, and the
Today screen's "You have met today's 10 new words" branch may show instead of the catch-up line. `dayStart` is also
set to today with the post-seed stages, which is right, but `laterRecall`/Graduated are unaffected (no later-day recall
was seeded), so all 30 words are Learning; see P-8 for why that matters to the fading mark.

VERIFIED: `applyGrade` (app.js 100–118) keys everything by `store.todayKey(at)` with `at = now()`; `debugSeed`
(1002–1012) calls it with the real clock. Shifting `last_review` does reproduce an absence for FSRS itself — probe:
a card graduated with S 2.31, `last_review` moved back 7 d, then Good → `elapsed_days` 7, S 21.4, interval 23 d, R
before 0.808, matching the research's numbers. So the shifting approach is sound for the cards; it is the day-keyed
records that are wrong.

Amendment: seed with a shifted clock instead of shifting afterwards: make `now()` read a debug offset
(`const now = () => new Date(Date.now() − debugOffsetMs)`), set the offset to `days` during `debugSeed` and clear it
after. Everything — cards, log, `newIntroduced`, `sessions`, `dayStart` — then lands on the earlier day keys. Spread
the words over several seeded days (e.g. 10 a day for `days` back to `days − 2`) so their stabilities and R differ,
which is what a real return looks like and what the lowest-R ordering needs in order to be visible. Pick a default
that crosses the thresholds: 30 words = 60 overdue cards, which is *not* "more than 60", so neither ordering nor the
soft stop would fire (see P-7); default 40 words or document the boundary.

### P-5 — SHOULD-FIX — The `visibilitychange` rebuild can take a revealed card out from under him; a day check in `nextCard` is simpler and safer

Scenario: 3:58 am, a Write card is revealed (answer shown, pad written), Steve switches to a dictionary app, comes
back at 4:01. The listener sees `session.day !== todayKey()` and calls `resumeOrStart` → `startSession`: the current
card is dropped ungraded, the pad is destroyed (`startSession` → `renderStudy` → `nextCard` → `dropPad`), `done` resets, and the Meet stars reset (`carryMeet` with a new day). "Skip if the pad is
expanded" does not cover the small pad or a revealed card. Desktop browsers also do not fire `visibilitychange` on a
plain window switch, only on tab/minimise, so the open-laptop case the research described is only partly covered.

REASONED from `startSession` and `renderStudy` (no probe; the listener does not exist yet).

Amendment: instead of (or in addition to) the listener, check the day where the next card is drawn: in `nextCard()`
(or at the top of `onGrade` after the grade is applied), if `session.day !== store.todayKey()` call `startSession()`
and return. The grade he is making lands under the right day key, nothing shown is lost, and no event is needed —
the open tab rebuilds at his next tap whether the browser fired an event or not. Keep a listener only for the
*finished* state (wrap-up or "All caught up" showing with no current card), where a rebuild loses nothing. The
Playwright test then becomes: fast-forward past 4 am, grade the shown card, expect a new day's session.

### P-6 — QUESTION / simpler design — Catch-up is mostly a stop point; the threshold of 15 matters less than the plan suggests, and the mechanism could be the soft stop itself

What 15 does. Under day-based due, overdue cards exist only after a missed day or a session stopped inside its recall
phase (every card due today is in today's session; new intervals are ≥ 1 day — probe: relearning exit is 1 day, Hard
on a review card 7 days — so graded cards do not come back the same day). Checks against the research's numbers:
- One missed day in steady state: ≈ 41 cards due a day (days 5–9) → ≈ 41 overdue → catch-up. Right.
- One missed day early on: day 2 missed at 10 words/day → ≈ 20 cards (recall + in-verse) overdue → catch-up.
  At 5 words/day (the pace he mentioned for a new book) ≈ 10 → no catch-up, which is harmless: the composer already
  puts the 10 reviews before the 5 new words.
- An interrupted session: the queue is recall → meet → deepen/tell, so what is left after an interruption is mostly
  new cards (never graded, so never overdue). Overdue ≥ 15 happens only if he stops with 15+ *reviews* still unseen.
  The research's "24 queued, 4 in steps" scenario leaves well under 15. The plan's claim holds, REASONED from the
  queue order in `composeSession` (recall first, line `queue = [...shuffleWith(recallDue…`).
So 15 is defensible. But note what a false trigger costs under the plan: reviews first (which happens anyway), then a
"Caught up" wrap-up, then one press of "Meet 10 new". That is the entire difference between catch-up and a normal
day. Which raises the question: why zero the allowance at all?

Simpler design (REASONED): keep the composer as it is (recall before meet), and make catch-up a *checkpoint* between
the recall phase and Meet: when the day began with overdue ≥ CATCH_UP_MIN, after the last recall-phase card show the
same interstitial as the soft stop — "Caught up: N reviews from earlier days done. Meet today's 10 new words, or
leave them for tomorrow?" with "Meet 10 new" / "Stop for today". Then:
- no `newWords: 0` path, no session flag for `queueWriteCard` (defer write-card unlocks past the checkpoint instead
  of 3 cards later), no special "Meet N new" wrap-up button, no `learnMoreWords` with `n = allowance` (P-2 shrinks to
  nothing, because the allowance is never zeroed);
- the reload inconsistency in §2 ("a reload brings the day's new words") disappears: the queue is the same either way;
- the soft stop and the catch-up share one component and one piece of persisted state (`state.stopped = { day }`,
  see P-1), with two triggers (60 reviews graded; or the end of recall on a catch-up day).
The Today header line ("Catching up: N reviews waiting from earlier days…") stays. If Steve prefers the plan's
"new words wait" wording as a rule rather than a question, keep the plan — but P-1 and P-2 then both need fixing.

### P-7 — SHOULD-FIX — The soft stop and the ordering use two different "60"s, the counter is unspecified, and Review 10 / Write 10 can feed it

- Ordering fires when *due reviews* > 60 (`BACKLOG_ORDER_MIN`); the soft stop when *recall-phase cards* > 60
  (`SOFT_STOP`), and recall-phase = `recallDue` + `recallSoon` (cards in steps). Scenario: 58 due + 3 in steps → the
  stop fires, the ordering did not, and the interstitial says "the ones most at risk are behind you", which is false.
  REASONED from `composeSession` (`recall = [...recallDue, ...recallSoon]`, `counts.recall = recall.length`).
  Amendment: one flag — `composeSession` returns `ordered: true` when it sorted by risk, and the soft stop is offered
  only when `ordered` (or the message drops the "most at risk" clause when it is not).
- "After the 60th graded review card": `session.done` counts every grade, including the requeues of step cards and
  relearning (Again → 10-minute step → graded again). Say what is counted: distinct recall-phase cards graded at least
  once (a Set of ids), not grades. Otherwise a bad day with 20 lapses reaches "60" at the 40th card.
- Review 10 and Write 10 push cards into `session.queue` without resetting `phaseOf`; a card graded this morning and
  pulled again by Review 10 still has `phaseOf = 'recall'`, so it would count. Stop counting once the wrap-up has
  been shown (`session.finished`), and never show the interstitial in `studyAhead`/`writeAhead` queues. The plan asks
  this as a question in its risks list; the answer is "no soft stop there", because those queues are at most 10.
- "Shown at most once per day" with `state.softStop = { day }` is fine across `learnMoreWords` rebuilds (keepDone) and
  reloads, but see P-1: without a persisted *stop*, once-per-day means the second encounter with the pile has no stop.

### P-8 — SHOULD-FIX — The fading mark excludes Learning-stage words, which after a week away are nearly the only words that fade

Plan §4: "applies only to words in Graduated or Solid (a word in Learning is expected to be shaky)". Under decision 26,
Learning = met, recall card in Review state, not yet recalled on a later day — its stability is the first session's,
S ≈ 2.3 d. Probe (scheduler.js, 3 × Good at 1 m/10 m/10 m): S 2.31; R 0.947 at +2 d, 0.858 at +5 d, 0.823 at +7 d,
0.785 at +10 d, 0.749 at +14 d. A Graduated word (one later-day recall) has S ≈ 11 d (research §1 probe), so its R
after a 7-day break is ≈ 0.87; the research says outright that no word with S ≥ 7 falls below 0.8 in a week. So the
29 of 90 words the research counts as fading after a 7-day break are, almost all, Learning-stage words — the ones the
plan does not mark. After a 7-day break the mark shows on roughly nothing; after 10 days it shows on the words met in
the last days before leaving, still only if they are allowed. VERIFIED by probe plus the research's own numbers.

"Expected to be shaky" was true of the *old* Learning (in its first-session steps); the new Learning is a word with a
real forgetting curve. Amendment: apply the mark to every word whose recall card is in `State.Review` (exclude only
cards in Learning/Relearning steps, where R is meaningless minutes after a grade), whatever the stage. Keep the
threshold 0.80 — the probe shows 0.80 ≈ 9 days of absence for a fresh word, ≈ 3.3 × S in general, so it reads as
"you were away", never on a normal day under day-based due (R at the session ≈ 0.9). That is a good property worth
stating in the Words-tab wording. Also `?debug=away` (P-4) would otherwise show no fading chips at all, since every
seeded word is Learning.

Performance is not a concern: `get_retrievability` is one `Math.pow`; cache the Set alongside `stageCache` and
invalidate it in `invalidateStages` (which `navigate` already calls), so Read and Words compute it once per render.

### P-9 — MINOR — Wording that changes meaning under day-based due

- Progress "due now" (`dueCards(at).length`) becomes "due today"; the "All caught up … Nothing is due right now" text
  likewise. VERIFIED: labels at app.js 833/858 and 457.
- The wrap-up line "Next cards come due ${fmtDue(next)}" takes the minimum due over all cards; after a soft stop or an
  early stop the minimum is an overdue card, so it says "Next cards come due now." under a screen that just said the
  rest can wait until tomorrow. Amendment: when cards due today remain, say "N reviews wait until tomorrow." instead.
- The catch-up header says "N reviews waiting"; N is cards (recall, in-verse, form, Which word?), not words. "Reviews"
  is right; make sure N is the card count, and that it is recomputed after Meet 5 new rebuilds (keepDone).

### P-10 — MINOR — On a reload, cards in their short steps are now shuffled among the day's reviews rather than appended

Today `recallSoon` (in steps, not yet due) goes after the shuffled due cards, sorted by due. With day-based due those
cards are `isDue`, so they join `recallDue` and are shuffled: a card graded 30 seconds before a reload may come first.
No double-listing (`recallSoon` is `!isDue && inSteps`, disjoint by construction — VERIFIED by reading). The in-session
requeue in `onGrade` is untouched. Acceptable; if it bothers him, exclude step cards from `recallDue` in the composer
(`inSteps` → `recallSoon` regardless of `isDue`) so their order stays as it is. The plan's "check" in §1 is answered.

### P-11 — MINOR (accepted, with two notes) — Old day keys and the first day after deployment

- Records before the change were keyed by local midnight; `laterRecalls` at load re-derives `dayOf(e.at)` with the
  new key while `newIntroduced` keeps old keys. Only entries between midnight and 4 am differ, and `fillLaterRecall`
  only fills gaps, so nothing already Graduated is lost. The streak can drop one day if an evening's only session was
  recorded after midnight. Accepted, as the plan says; put the sentence in the STATUS decision so a surprising streak
  has an explanation.
- First day: a session at 1 am after deployment counts for the previous day: same `dayStart`, same `meetDay`, same
  allowance ("You have met today's 10 new words" if the evening session met them). That is the intended meaning of a
  4 am rollover, but it is the one visible change on day one; say it in the wrap-up or the Today header the first time
  (`sessions[yesterdayKey]` non-empty and hour < 4 → "Before 4 am counts as yesterday").
- `pruneSnapshots`, `momentumHTML` and `streak` do key arithmetic on `Date` and then call `todayKey`; all consistent once
  `todayKey` shifts. VERIFIED by reading (app.js 789–793, 803, 816; guide.js `pruneSnapshots`).

### P-12 — SHOULD-FIX (corollary of P-1) — "Meet 5 new" on a stopped day puts the declined pile back in front of the new words

Scenario: soft stop taken, wrap-up shows "Meet 5 new". `learnMoreWords` → `startSession({ keepDone: true, newWords: 5 })`
→ `composeSession` takes every due card again: the 105 declined reviews come first (recall precedes meet in the queue),
then the five words. He asked for five words and got 105 reviews. VERIFIED by reading `learnMoreWords` and the
composer's queue order. Amendment: with a persisted stop (P-1), `startSession` on a stopped day composes with
`isDue` restricted to step cards (or `dueReviews: false`), so the rebuild holds only what was asked for. The same
guard serves the "Caught up → Meet N new" button, which otherwise relies on overdue being exactly 0.

### P-13 — QUESTION — Reload after catching up starts Meet 10 without asking; the wrap-up asks

§2: "After catching up, overdue is 0, so a reload brings the day's new words. This is consistent with the button."
It is consistent in outcome but not in manner: the wrap-up offers Meet N new as a choice, a reload (or opening the
app on the phone after catching up on the laptop — same storage? no: storage is per device, so this is reload only)
makes the choice for him and starts a 20-card Meet. Under P-6's checkpoint design the question does not arise. If the
plan stays, record the choice (`state.caughtUp = { day }` → the rebuild composes `newWords: 0` until he presses the
button, which sets `moreWords`). MINOR either way; flagged because "the app does not pretend nothing happened" is a
stated goal and a silent Meet 10 after the "Caught up" screen is a small pretence.

### P-14 — MINOR — What the plan dropped or shifted from the research

- Research rec 2 said "New words resume tomorrow"; the plan resumes them the same day by button. Better for pace
  (keeps 10/day), and his to choose; the simulation's 27-minute return day assumed no new words that day, so the
  plan's return day is ≈ 42 minutes if he presses the button. Say so in the STATUS decision.
- Research rec 3 named descending R as the kinder order (fewer failures, same words kept); the plan picks ascending
  and marks it as Steve's to veto. Fine, but the interstitial wording ("the ones most at risk are behind you") is the
  argument for ascending; if he vetoes to descending the wording must change too. Keep them in one place.
- Research §4: "Say plainly that it is a prediction: the first review back decides." The plan's Progress line says
  "may have faded"; the Words chip "fading" and the dotted Read underline carry no such hedge. A `title`/aria-label
  "probably faded while you were away; the next review decides" on the chip covers it cheaply.
- Research rec 1 allowed "local midnight or 4 am"; the plan takes 4 am and marks it veto-able. Right.
- Nothing else recommended was dropped; "leave alone" items match the plan's "Not changing" list.

### P-15 — MINOR — Test plan notes

- The Playwright pass after `fastForward` 7 days then reload: `page.clock.install` must precede the first load, and the
  scratch storage of `?debug=…` is wiped on load, so the "week away" browser check must run on a plain URL (own
  port, per COMMON.md) or use `?debug=away` once P-4 is fixed. State this in the test so a QA agent does not combine
  `?debug=` with a reload and conclude catch-up is broken.
- Unit tests for `backlog` should include: a card due 03:59 today (overdue? no — it is due *today* by the new key) and
  one due 03:59 yesterday-by-key, i.e. the rollover boundary on both sides; and `todayKey` at 03:59/04:00 across a
  month end (31 Oct 02:00 → "2026-10-30"; 1 Nov 02:00 → "2026-10-31"), since `d − 4 h` crosses the month.
- The "session interrupted at night and resumed after 4 am" browser scenario should assert the Meet stars start a new
  round and `done` resets — that is the intended behaviour, and the test should say so rather than leave it to the
  reader.

## What is sound

- Day-based due with a 4 am rollover: the right fix, the strongest result in the research, correctly scoped to
  `isDue`/`dueCards` with the composer untouched; `recallSoon` cannot double-list; the requeue is unaffected; all
  day-keyed records go through `todayKey` already, so the shift is one function.
- `dayEnd` as a store helper; keeping timestamps for "next cards come due".
- Catch-up defined on *overdue* (due before today's rollover), not on backlog size — exactly the research's lesson
  that rule (b) misfires. Overdue only arises from a missed day or a stop, so false triggers are rare and cheap.
- Lowest-R-first in blocks of 20 with in-block shuffle; threshold 60 ≈ 1.5 normal days; the soft stop as an offer,
  not a cap (the research's "a cap without pausing never catches up" is respected).
- Fading as a derived mark outside stages, `stageDiff`, `dayStart` and snapshots, at 0.80.
- Shifting `last_review`/`due` for `?debug=away` does reproduce an absence for FSRS (probe: elapsed_days 7, S 21.4).
- Leaving learning steps, relearning, and the UTC-day quirk alone.
- The order of work, per-step tests, decisions 27+, and the josie-stats note.

## Verdict

**Proceed with amendments.** Nothing in the plan is wrong in direction; two things are wrong in mechanism and would
show on the first real backlog day: a stop that does not stick (P-1, P-12) and a manual override that does nothing
(P-2). Fix those, give Review 10 the declined cards (P-3), fix the debug seed's day keys (P-4), prefer a day check at
`nextCard` over a `visibilitychange` rebuild (P-5), align the two 60s and define the counter (P-7), and let the fading
mark cover Learning-stage words (P-8) — otherwise it marks almost nothing after a week away. P-6 offers a simpler
shape for catch-up (a checkpoint between recall and Meet, sharing the soft stop's interstitial and persisted state)
that removes P-2 and P-13 outright; it is a design choice for Steve, not a defect in the plan.
