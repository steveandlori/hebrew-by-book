import BOOK_DATA from '../data/ruth.js';
import * as store from './store.js';
import { makeScheduler, hydrate, dehydrate, emptyCard, grade, State, retrievability } from './scheduler.js';
import { STAGES, STAGE_LABEL, PHASE_LABEL, inPlaceViews, writePractice, meetStep, meetStars, carryMeet, stagesByItem, countStages, stageDiff, composeSession, allowances, hintLadder, autoRating, revealLine, nudgeFor, buildSnapshot, pruneSnapshots } from './guide.js';
import { indexBook, buildDeck, formsOf, variantFor, KIND_LABEL, plain } from './deck.js';
import { createPad } from './pad.js';
import { makeRenderer, esc, shortParse } from './render.js';
import { methodHTML } from './method.js';

/* ───────────────────────── helpers ───────────────────────── */

const $ = (sel, el = document) => el.querySelector(sel);

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function fmtDays(d) {
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d} days`;
}
function fmtDue(due, now = new Date()) {
  const ms = due - now;
  if (ms <= 0) return 'now';
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${min} min`;
  const days = Math.round(ms / 86400000);
  if (days < 1) return 'later today';
  return fmtDays(days);
}

/* ───────────────────────── book and deck ───────────────────────── */

const BOOK = indexBook(BOOK_DATA);
const BOOK_NAME = BOOK_DATA.book.name;
const DECK = buildDeck(BOOK);
const DECK_BY_ID = Object.fromEntries(DECK.map(c => [c.id, c]));

const POS_LABEL = {
  N: 'noun', Np: 'proper name', V: 'verb', A: 'adjective', Ag: 'gentilic adjective', Ao: 'ordinal number', D: 'adverb',
  C: 'conjunction', R: 'preposition', T: 'particle', Tm: 'demonstrative particle', Tj: 'interjection',
  P: 'pronoun', Pp: 'personal pronoun', Pd: 'demonstrative pronoun', Pi: 'interrogative pronoun', Pf: 'indefinite pronoun',
};
const posLabel = p => POS_LABEL[p] || p || '';
const NAME_KIND = tm => /-P$/.test(tm) ? 'person' : /LG$|PG$/.test(tm) ? 'people' : /L$/.test(tm) ? 'place' : 'title';
const nameKind = l => l.kind || NAME_KIND(l.tm);
// A key to the parse abbreviations (standard grammar terms; the parses themselves are OSHB's tagging).
const PARSE_KEY = `<details class="abbr"><summary>Reading the parses</summary><ul class="small">
  <li><b>3ms</b>: person (1, 2, 3), gender (m masculine, f feminine, c common to both, b a noun used as either), number (s singular, p plural, d dual).</li>
  <li><b>perfect (qatal)</b>, <b>imperfect (yiqtol)</b>, <b>wayyiqtol</b> (the narrative form with וַ), <b>sequential perfect (weqatal)</b>, cohortative, jussive, imperative, infinitive, participle.</li>
  <li><b>Qal, Niphal, Piel, Pual, Hiphil, Hophal, Hithpael</b>: the verb stems (binyanim).</li>
  <li><b>absolute / construct</b>: a noun standing alone, or bound to the next word ("X of").</li>
  <li><b>+</b> joins the parts of one written word: prefix + word + suffix.</li></ul></details>`;

// Haktuvim (Bible Society in Israel): the text with an audio recording by a native reader, per chapter.
const haktuvimURL = chapter => `https://haktuvim.co.il/study/${BOOK_DATA.book.id}.${chapter}`;
const refLabel = ref => `${BOOK_NAME} ${ref.replace('.', ':')}`;
const verseLinks = ref => {
  const [c, v] = ref.split('.');
  return `<a href="https://www.stepbible.org/?q=version=OHB|reference=${BOOK_DATA.book.id}.${c}.${v}" target="_blank" rel="noopener">STEP Bible</a><span class="sep"> · </span><a href="https://www.sefaria.org/${BOOK_DATA.book.id}.${c}.${v}?lang=he" target="_blank" rel="noopener">Sefaria</a>`;
};

/* ───────────────────────── state ───────────────────────── */

// Debug links (Steve, 2026-10-24): ?debug=<scenario> opens one part of the app directly, for checking it without
// working through a day's cards. They use scratch storage, wiped at each load; see DEBUG_SCENARIOS near the end.
const DEBUG_PARAMS = new URLSearchParams(location.search);
const DEBUG = DEBUG_PARAMS.get('debug');
if (DEBUG) store.useScratchStorage();

let state = store.loadState();
let scheduler = makeScheduler(state.settings);
const now = () => new Date();

function persist() {
  if (!store.saveState(state)) toast('Could not save progress. Is private browsing on?');
}
function cardState(id) { return hydrate(state.cards[id]); }
function isDue(id, at = now()) { const c = cardState(id); return c && c.due <= at; }
function isNew(id) { return !state.cards[id]; }

const moreWordsToday = () => (state.moreWords && state.moreWords.day === store.todayKey() ? state.moreWords.n : 0);
const todaysAllowances = () => allowances(state.newIntroduced[store.todayKey()] || [], state.settings.newPerDay, moreWordsToday());
const newWordAllowance = () => todaysAllowances().words;
const extraAllowance = () => todaysAllowances().extra;

function dueCards(at = now()) {
  return DECK.filter(c => isDue(c.id, at)).sort((a, b) => cardState(a.id).due - cardState(b.id).due);
}

function applyGrade(card, rating, hints = 0) {
  const at = now();
  const prev = cardState(card.id) || emptyCard(at);
  const wasNew = isNew(card.id);
  const r = grade(scheduler, prev, rating, at);
  state.cards[card.id] = dehydrate(r.card);
  state.log.push({ id: card.id, rating, at: at.toISOString(), hints });
  if (state.log.length > 5000) state.log = state.log.slice(-5000);
  const day = store.todayKey(at);
  state.sessions[day] = (state.sessions[day] || 0) + 1;
  if (wasNew) (state.newIntroduced[day] = state.newIntroduced[day] || []).push(card.id);
  persist();
  return r.card;
}

let stageCache = null;
function stages() { return stageCache || (stageCache = stagesByItem(DECK, cardState)); }
function invalidateStages() { stageCache = null; }
function stageOfLex(id) {
  const l = BOOK.lexemes.get(id);
  if (!l || l.affix || l.name) return 'known';
  return stages().get(id) || 'new';
}

/* ───────────────────────── Hebrew rendering ───────────────────────── */

const pointed = () => state.settings.pointing !== 'unpointed';
const { heb, tokText, lemmaText, verseHTML, formHTML, lookalikeHTML } = makeRenderer({ lexemes: BOOK.lexemes, isPointed: pointed, stageOf: id => stageOfLex(id) });

function bdbCite(l) {
  if (!l || !l.bdb) return '';
  return `<span class="cite-bdb">BDB p. ${l.bdb.page}${l.def ? `: <em>${esc(l.def)}</em>` : ''}</span>`;
}
function glossNote(l) {
  if (!l.glossNote) return '';
  return `<p class="source">Gloss adjusted from TBESH's “${esc(l.glossNote.was)}”: ${esc(l.glossNote.why)} (${esc(l.glossNote.source)}).</p>`;
}
const sourceLine = () => `<p class="source">Gloss: TBESH (STEPBible.org, CC BY). Definition and page: Brown-Driver-Briggs via the OpenScriptures Lexical Index. Text and parsing: Open Scriptures Hebrew Bible.</p>`;

/* ───────────────────────── card faces ───────────────────────── */

function cardHeader(card, phase = null) {
  const ph = phase ? `<span class="phase ph-${phase}">${PHASE_LABEL[phase]}</span>` : '';
  const ch = `<span class="topic">${esc(BOOK_NAME)} ${BOOK.chapterOf(card.item.first)}</span>`;
  return `<div class="card-meta">${ch}${ph}<span class="card-kind">${KIND_LABEL[card.kind]}</span></div>`;
}

function verseOfToken(id) { return BOOK.verseOf.get(id); }

function frontHTML(card) {
  const w = card.item;
  switch (card.kind) {
    case 'recall':
      return `<div class="prompt">What does this word mean?</div><div class="lemma">${heb(lemmaText(w), 'big')}</div>`;
    case 'ctx':
    case 'form': {
      const v = verseOfToken(card.token);
      return `<div class="prompt">What does the highlighted word mean here?</div>
        <div class="vref muted">${esc(refLabel(v.ref))}</div>${verseHTML(v, { highlight: card.token })}`;
    }
    case 'which': {
      const v = verseOfToken(card.token);
      return `<div class="prompt">Which dictionary word is the highlighted form?</div>
        <div class="vref muted">${esc(refLabel(v.ref))}</div>${verseHTML(v, { highlight: card.token })}`;
    }
    case 'write': {
      const v = verseOfToken(card.token);
      const t = BOOK.tokens.get(card.token);
      const asVerse = writeForm() === 'verse';
      return `<div class="prompt">Write the missing word in Hebrew: ${asVerse ? 'as it stands in the verse' : 'its dictionary form'}.</div>
        <p class="cue"><b class="en">${esc(t.en || w.gloss)}</b> <span class="muted">${esc(posLabel(w.pos))}</span></p>
        ${asVerse ? '' : `<p class="small muted">Dictionary form: as listed in Words (a verb's Qal perfect “he” form, e.g. ${heb(pointed() ? 'קָטַל' : 'קטל')}; a noun's singular).</p>`}
        <div class="vref muted">${esc(refLabel(v.ref))}</div>${verseHTML(v, session.revealed ? { highlight: card.token } : { blank: card.blank ? [card.token, ...card.blank] : card.token })}`;
    }
  }
}

// What a Write-the-Hebrew card asks for, in the current pointing.
const writeTarget = card => (writeForm() === 'verse'
  ? { label: 'In the verse', text: tokText(BOOK.tokens.get(card.token)) }
  : { label: 'Dictionary form', text: lemmaText(card.item) });

function formsListHTML(l, max = 8) {
  const forms = formsOf(BOOK, l);
  const REFS = 8;
  const refs = f => f.tokens.slice(0, REFS).map(t => `<a href="#read/${t.ref}">${esc(t.ref.replace('.', ':'))}</a>`).join(', ')
    + (f.tokens.length > REFS ? `, <a href="#words/${l.id}">+${f.tokens.length - REFS}</a>` : '');
  const rows = forms.slice(0, max).map(f => `<li>${heb(pointed() ? f.text : f.cons)}<span>${esc(f.parse)}</span><span class="refs-inline">${refs(f)}${f.kq ? ` <span class="chip chip-kq">${f.kq === 'k' ? 'written' : 'read'}</span>` : ''}</span></li>`).join('');
  const more = forms.length > max ? `<p class="muted">and ${forms.length - max} more forms. <a href="#words/${l.id}">See them all</a></p>` : '';
  return `<ul class="forms">${rows}</ul>${more}`;
}

function wordSummaryHTML(l) {
  return `<div class="wordsum"><div>${heb(lemmaText(l), 'mid')}</div><div><b class="gloss">${esc(l.gloss)}</b>
    <span class="muted">${esc(posLabel(l.pos))}${l.tr ? ` · ${esc(l.tr)}` : ''} · ${l.n}× in ${esc(BOOK_NAME)}</span><br>${bdbCite(l)}</div></div>`;
}

function backHTML(card) {
  const w = card.item;
  switch (card.kind) {
    case 'recall':
      return `${wordSummaryHTML(w)}${lookalikeHTML(w)}${glossNote(w)}<h3>Its forms in ${esc(BOOK_NAME)}</h3>${formsListHTML(w, 6)}${sourceLine()}`;
    case 'write': {
      const t = BOOK.tokens.get(card.token);
      return `<h3>Dictionary form</h3>${wordSummaryHTML(w)}<h3>In ${esc(refLabel(verseOfToken(card.token).ref))}</h3>${formHTML(t)}${PRACTICE_HTML}${lookalikeHTML(w)}${sourceLine()}`;
    }
    case 'ctx':
    case 'form':
    case 'which': {
      const t = BOOK.tokens.get(card.token);
      const v = verseOfToken(card.token);
      return `<h3>This form</h3>${formHTML(t)}
        <h3>Dictionary word</h3>${wordSummaryHTML(w)}${lookalikeHTML(w)}${glossNote(w)}
        <p class="links">${esc(refLabel(v.ref))}: <a href="#read/${v.ref}">read it in context</a><span class="sep"> · </span>${verseLinks(v.ref)}</p>${sourceLine()}`;
    }
  }
}

// After a Write the Hebrew card is revealed: a second pad, folded away, to copy either form with the answer in
// view (Steve, 2026-10-24). Ungraded; the card's grade is still the first attempt's.
const PRACTICE_HTML = `<details class="practice"><summary>Practice?</summary><p class="small muted">Copy the dictionary form or the form in the verse. This is not graded.</p><div id="practicehost"></div></details>`;

/* ───────────────────────── study session ───────────────────────── */

const session = {
  queue: [], done: 0, total: 0, mode: 'today', revealed: false, current: null, choices: null, picked: null,
  hints: 0, pad: null, practicePad: null, sketch: null, shown: 0, phaseOf: null, counts: null, stagesBefore: null,
  meetStars: 0, meetSteps: new Map(), whichStreak: 0,
};

function startSession() {
  session.mode = 'today';
  session.day = store.todayKey();
  session.done = 0; session.revealed = false; session.current = null;
  session.meetStars = 0; session.meetSteps = new Map(); session.whichStreak = 0;
  const r = composeSession({ deck: DECK, getCard: cardState, isDue: id => isDue(id), newWords: newWordAllowance(), extra: extraAllowance(), writeAfter: state.settings.writeAfter });
  session.queue = r.queue; session.phaseOf = r.phaseOf;
  // Stars earned earlier today survive a reload (josie-stats found they reset).
  const meet = carryMeet(state.meetDay, session.day, r.phaseOf);
  state.meetDay = meet;
  session.meetSteps = new Map(Object.entries(meet.steps)); session.meetStars = meet.stars;
  session.counts = { recall: 0, meet: 0, deepen: 0, tell: 0 };
  for (const p of r.phaseOf.values()) session.counts[p]++;
  session.counts.meet = meet.ids.length;
  // The wrap-up compares with the day's start, kept across a reload (QA found "0 words met" after one).
  if (state.dayStart && state.dayStart.day === session.day) session.stagesBefore = new Map(state.dayStart.stages);
  else {
    session.stagesBefore = stagesByItem(DECK, cardState);
    state.dayStart = { day: session.day, stages: [...session.stagesBefore] };
    persist();
  }
  session.total = r.queue.length;
  renderStudy();
}

// Write the Hebrew set to Off keeps those cards out of every queue.
const writeOn = c => c.kind !== 'write' || state.settings.writeAfter > 0;

// Review 10: cards already met, soonest due first, ahead of schedule. New words are never slipped in
// here; they are their own choice (Meet 5 new), so the day's number stays what Steve set.
function studyAhead(n = 10) {
  const at = now();
  const ahead = DECK.filter(c => writeOn(c) && !isNew(c.id) && !isDue(c.id, at)).sort((a, b) => cardState(a.id).due - cardState(b.id).due).slice(0, n);
  if (!ahead.length) { toast('Nothing to review yet.'); return; }
  session.queue = shuffle(ahead);
  session.total = session.done + session.queue.length;
  renderStudy();
}

// Write 10: Write the Hebrew cards only, for words already met (writePractice), so a review can be all writing.
const WRITE_MORE = 10;
const writeCards = () => writePractice({ deck: DECK, getCard: cardState, n: WRITE_MORE, writeAfter: state.settings.writeAfter });
function writeAhead() {
  const cards = writeCards();
  if (!cards.length) { toast('No words to write yet.'); return; }
  session.queue = shuffle(cards);
  session.total = session.done + session.queue.length;
  renderStudy();
}

// Meet 5 new: raises today's new-word number by five and rebuilds the session, so the words get a Meet
// round of their own (with its stars) and the raise survives a reload. Tomorrow is back to the usual number.
const MORE_WORDS = 5;
const wordsLeftToMeet = () => DECK.filter(c => c.kind === 'recall' && isNew(c.id)).length;
function learnMoreWords() {
  state.moreWords = { day: store.todayKey(), n: moreWordsToday() + MORE_WORDS };
  persist();
  startSession();
}
// The buttons under a finished day (Steve, 2026-10-24): Review 10, Write 10 while there are words to write,
// Meet 5 new while any are left. No Read link: the Read tab is always in reach (Steve).
function moreButtonsHTML() {
  const left = Math.min(MORE_WORDS, wordsLeftToMeet());
  const writes = writeCards().length;
  return `<div class="row"><button class="btn" id="ahead">Review 10</button>${writes ? `<button class="btn" id="write-more">Write ${writes}</button>` : ''}${left ? `<button class="btn" id="more-words">Meet ${left} new</button>` : ''}</div>`;
}
function wireMoreButtons() {
  $('#ahead').onclick = () => studyAhead(10);
  const w = $('#write-more');
  if (w) w.onclick = writeAhead;
  const m = $('#more-words');
  if (m) m.onclick = learnMoreWords;
}

// Forget the in-memory session (after import or Start over) so Today rebuilds from the new state.
function resetSession() {
  dropPad();
  Object.assign(session, { queue: [], done: 0, total: 0, revealed: false, current: null, choices: null, picked: null, hints: 0, sketch: null, phaseOf: null, counts: null, stagesBefore: null, day: null, meetStars: 0, meetSteps: new Map(), whichStreak: 0 });
}

function dropPad() {
  if (session.pad) { session.pad.destroy(); session.pad = null; }
  if (session.practicePad) { session.practicePad.destroy(); session.practicePad = null; }
}

// A Write card keeps the form it was first shown with, even if the setting changes mid-card.
const writeForm = () => session.writeForm || state.settings.writeForm;

function nextCard() {
  session.writeForm = state.settings.writeForm;
  session.revealed = false; session.choices = null; session.picked = null;
  session.hints = 0; session.sketch = null;
  dropPad();
  // Each review shows the card's next verse, so a word is met in more than one place.
  const card = session.queue.shift() || null;
  session.current = card && variantFor(card, (cardState(card.id) || {}).reps || 0);
  session.shown++;
  renderStudy();
}

function onGrade(rating) {
  const card = session.current;
  if (!card) return;
  const updated = applyGrade(card, rating, session.hints);
  invalidateStages();
  session.done++;
  // Cards still in learning come back later in this same session.
  const inSteps = updated.state === State.Learning || updated.state === State.Relearning;
  if (session.phaseOf && session.phaseOf.get(card.id) === 'meet') {
    const step = meetStep(session.meetSteps.get(card.id) || 0, rating, !inSteps);
    session.meetSteps.set(card.id, step);
    if (state.meetDay) state.meetDay.steps[card.id] = step;
  }
  if (inSteps && writeOn(card)) {
    const pos = Math.min(session.queue.length, 3 + Math.floor(Math.random() * 3));
    session.queue.splice(pos, 0, card);
    session.total++;
  }
  if (card.kind === 'ctx' || card.kind === 'form') queueWriteCard(card.item);
  nextCard();
  const stars = meetStarsNow();
  if (stars > session.meetStars) {
    session.meetStars = stars;
    if (state.meetDay) state.meetDay.stars = stars;
    celebrate(stars >= 5 ? 'Meet complete ★★★★★' : `Meet: ${stars} of 5 ★`, stars >= 5 ? 'Meet complete: all 5 stars' : `Meet: ${stars} of 5 stars`, stars >= 5 ? 'full' : '');
  }
  persist();
}

// The second time a word is read in place, its Write the Hebrew card joins this session a few cards later
// (within the day's cap on new practice cards), rather than waiting for the next session to be planned.
function queueWriteCard(item) {
  const after = state.settings.writeAfter;
  const wc = DECK_BY_ID[`${item.id}:write`];
  if (!after || !wc || !isNew(wc.id) || session.queue.includes(wc)) return;
  if (inPlaceViews(DECK.filter(c => c.item.id === item.id), cardState) < after) return;
  const queuedNew = session.queue.filter(c => c.kind !== 'recall' && c.kind !== 'ctx' && isNew(c.id)).length;
  if (extraAllowance() - queuedNew <= 0) return;
  session.queue.splice(Math.min(session.queue.length, 3), 0, wc);
  session.total++;
  if (session.phaseOf) { session.phaseOf.set(wc.id, 'deepen'); session.counts.deepen++; }
}

// Meet is the long stretch of a day, so it is marked in fifths: a star for each fifth of the clean recalls
// its cards need (three each). A star once earned stays, even if a Not yet sets a card back. The one exception:
// raising new words a day mid-day makes a bigger round, and its stars are recounted (see carryMeet).
function meetStarsNow() {
  return Math.max(session.meetStars, meetStars(session.meetSteps.values(), session.counts ? session.counts.meet : 0));
}
const starsHTML = n => `<span class="stars" role="img" aria-label="${n} of 5 stars">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;

// A star (or a smaller spark) floats up in the middle of the screen and fades. Screen readers get plain
// words through the #announce live region instead of a row of star glyphs (from josie-stats).
function celebrate(text, spoken, cls = '') {
  const el = document.createElement('div');
  el.className = `burst ${cls}`.trim();
  el.setAttribute('aria-hidden', 'true');
  const live = $('#announce');
  if (live) { live.textContent = ''; setTimeout(() => { live.textContent = spoken; }, 50); }
  el.innerHTML = `<span class="burst-star" aria-hidden="true">${cls === 'spark' ? '✦' : '★'}</span><span class="burst-text">${esc(text)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function phaseStripHTML() {
  if (!session.phaseOf) return '';
  const left = { recall: 0, meet: 0, deepen: 0, tell: 0 };
  const pending = session.current ? [session.current, ...session.queue] : session.queue;
  for (const c of pending) { const p = session.phaseOf.get(c.id); if (p) left[p]++; }
  const cur = session.current && session.phaseOf.get(session.current.id);
  return `<div class="phases" aria-label="Today's phases">${Object.keys(PHASE_LABEL).filter(p => session.counts[p] > 0).map(p =>
    `<span class="ph${left[p] ? '' : ' is-done'}${cur === p ? ' now' : ''}">${PHASE_LABEL[p]}<b>${left[p]}<span class="sr-only"> left,</span></b>${p === 'meet' ? starsHTML(meetStarsNow()) : ''}</span>`).join('')}</div>`;
}

function padTitle(card) {
  const w = card.item;
  if (card.kind === 'recall') return `Meaning of ${lemmaText(w)}`;
  if (card.kind === 'write') return writeForm() === 'verse' ? 'Write the word as in the verse' : 'Write the dictionary form';
  const v = verseOfToken(card.token);
  return `The highlighted word in ${refLabel(v.ref)}`;
}

function hintHTML(h) {
  const lbl = t => `<span class="lbl">${t}</span>`;
  switch (h.type) {
    case 'pos': return `<li>${lbl('Part of speech')}${esc(posLabel(h.pos))}${h.tr ? `, pronounced ${esc(h.tr)}` : ''}</li>`;
    case 'verse': { const v = verseOfToken(h.token); return `<li>${lbl(`In ${esc(refLabel(v.ref))}`)}${verseHTML(v, { highlight: h.token })}</li>`; }
    case 'initial': return `<li>${lbl('The meaning starts with')}${esc(h.text)}</li>`;
    case 'lemma': { const l = BOOK.lexemes.get(h.item); return `<li>${lbl('Dictionary form')}${heb(lemmaText(l), 'mid')} <span class="muted">${esc(posLabel(l.pos))}</span></li>`; }
    case 'parse': { const t = BOOK.tokens.get(h.token); return `<li>${lbl('This form')}${esc(t.parse)}</li>`; }
    case 'sound': return `<li>${lbl('The dictionary form sounds like')}${esc(h.tr)}</li>`;
    case 'firstLetter': { const l = BOOK.lexemes.get(h.item); return `<li>${lbl('It starts with')}${heb(plain(l.he).replace(/־/g, '').charAt(0), 'mid')}</li>`; }
    default: return '';
  }
}

function choicesFor(card) {
  return shuffle([card.item.id, ...card.distractors]).map(id => BOOK.lexemes.get(id));
}

function renderStudy() {
  const view = $('#view');
  const card = session.current;

  if (!card && !session.queue.length) {
    if (session.done > 0) { renderWrapUp(); return; }
    const nothingNew = newWordAllowance() === 0;
    view.innerHTML = `<div class="card done"><h2>All caught up</h2>
      <p style="margin-top:10px">${nothingNew ? `You have met today's ${state.settings.newPerDay} new words and nothing is due yet.` : 'Nothing is due right now.'}</p>
      ${moreButtonsHTML()}</div>`;
    wireMoreButtons();
    return;
  }

  if (!card) { nextCard(); return; }

  const remaining = session.queue.length + 1;
  const pct = session.total ? Math.round((session.done / session.total) * 100) : 0;
  const isWhich = card.kind === 'which';
  const fresh = isNew(card.id);
  const isWrite = card.kind === 'write';
  const ladder = isWhich ? [] : hintLadder(card, { writeTarget: writeForm() });
  const phase = session.phaseOf ? session.phaseOf.get(card.id) : null;

  let body = `<div class="session-head"><h1>Today</h1><span class="muted">${remaining} left</span><span class="spacer"></span>${fresh ? '<span class="muted">new card</span>' : ''}</div>
    <div class="progress"><i style="width:${pct}%"></i></div>${phaseStripHTML()}
    <section class="card" aria-live="polite">${cardHeader(card, phase)}${frontHTML(card)}`;

  if (!isWhich && fresh && card.kind === 'recall') body += `<p class="meet">A new word for this deck. Guess anyway, even a rough one. A guess, even a wrong one, helps the answer stick.</p>`;
  if (!isWhich && !isWrite && !session.revealed) body += `<p class="nudge">${esc(nudgeFor(session.shown).text)}</p>`;
  if (session.hints > 0) body += `<ol class="hints" aria-label="Hints">${ladder.slice(0, session.hints).map(hintHTML).join('')}</ol>`;

  if (isWhich) {
    if (!session.choices) session.choices = choicesFor(card);
    const keys = ['1', '2', '3', '4'];
    body += `<div class="choices">${session.choices.map((l, i) => {
      let res = '';
      if (session.revealed) res = l.id === card.item.id ? ' data-result="right"' : (session.picked === l.id ? ' data-result="wrong"' : '');
      return `<button class="choice" data-pick="${l.id}"${res}${session.revealed ? ' disabled' : ''}><span class="key">${keys[i]}</span><span class="opt">${heb(lemmaText(l), 'mid')}<span class="name">${esc(l.gloss)}</span></span></button>`;
    }).join('')}</div>`;
  }

  if (session.revealed) {
    const line = isWhich ? null : revealLine(session.hints);
    let top = isWhich ? '' : `<p class="aloud">Read the Hebrew aloud once.</p>`;
    if (line) top += `<p class="reveal-line">${esc(line)}</p>`;
    const target = isWrite ? writeTarget(card) : null;
    const right = target
      ? `<figure><figcaption>${target.label}</figcaption><p class="heb-target">${heb(target.text, 'big')}</p></figure>`
      : `<figure><figcaption>The meaning</figcaption><p class="gloss-big">${esc(card.item.gloss)}</p></figure>`;
    const compare = session.sketch
      ? `<div class="compare"><figure><figcaption>Your answer</figcaption><img src="${session.sketch.url}" alt="Your handwritten answer"></figure>${right}</div>`
      : (target ? `<div class="compare one">${right}</div>` : '');
    body += `<div class="answer">${top}${compare}${backHTML(card)}</div>`;

    const nb = state.settings.gradeButtons;
    const preview = scheduler.repeat(cardState(card.id) || emptyCard(now()), now());
    const due = r => fmtDue(preview[r].card.due);
    const auto = isWhich ? null : autoRating(session.hints);
    if (isWhich) {
      const right = session.picked === card.item.id;
      body += right
        ? `<div class="grade one"><button class="btn g-good" data-grade="3">Right, next<small>back ${due(3)}</small></button></div>`
        : `<div class="grade one"><button class="btn g-again" data-grade="1">Not this one, next<small>back ${due(1)}</small></button></div>`;
      body += `<p class="hint"><span class="kbd">space</span> next</p>`;
    } else if (auto !== null) {
      body += `<div class="grade one"><button class="btn g-next" data-grade="${auto}" data-auto="1">Next<small>back ${due(auto)}</small></button></div><p class="hint">Graded for you because you used a hint. <span class="kbd">space</span> next</p>`;
    } else {
      const btn = (r, cls, label) => `<button class="btn ${cls}" data-grade="${r}">${label}<small>${due(r)}</small></button>`;
      const buttons = [btn(1, 'g-again', 'Not yet'), ...(nb >= 3 ? [btn(2, 'g-hard', 'Partly')] : []), btn(3, 'g-good', 'Got it'), ...(nb >= 4 ? [btn(4, 'g-easy', 'Easy')] : [])];
      body += `<div class="grade n${nb}">${buttons.join('')}</div>`;
      const keys = nb === 2 ? '<span class="kbd">1</span> not yet &nbsp; <span class="kbd">2</span> got it' : `<span class="kbd">1</span> not yet &nbsp; <span class="kbd">2</span> partly &nbsp; <span class="kbd">3</span> got it${nb === 4 ? ' &nbsp; <span class="kbd">4</span> easy' : ''}`;
      body += `<p class="hint">${keys}</p>`;
    }
  } else if (!isWhich) {
    if (isWrite) body += `<div id="padhost"></div>`;
    else if (state.settings.showPad) body += `<div id="padhost"></div><p class="hint"><a href="#" id="hidepad">Hide the writing pad</a></p>`;
    else body += `<p class="hint"><a href="#" id="showpad">Show a writing pad</a></p>`;
    body += `<div class="row answer-row"><button class="btn btn-primary" id="reveal">I have an answer</button>${ladder.length ? `<button class="btn" id="hint">${session.hints < ladder.length ? 'Give me a hint' : 'Show me'}</button>` : ''}</div>
      <p class="hint"><span class="kbd">space</span> answer &nbsp; <span class="kbd">h</span> hint</p>`;
  }
  body += '</section>';
  view.innerHTML = body;

  const captureSketch = () => { if (session.pad) { session.sketch = session.pad.hasInk() ? { url: session.pad.toDataURL(), ink: session.pad.snapshot() } : null; dropPad(); } };
  const doReveal = () => { captureSketch(); session.revealed = true; renderStudy(); };
  const host = $('#padhost');
  if (host) {
    session.pad = createPad(host, { title: padTitle(card), onAnswer: doReveal, height: isWrite ? 190 : 150 });
    if (session.sketch) session.pad.restore(session.sketch.ink);
  }

  // A re-render replaced the card, so a practice pad from before is gone with it.
  if (session.practicePad) { session.practicePad.destroy(); session.practicePad = null; }
  const practice = $('#view details.practice');
  // Made on first open (the canvas takes its size from a visible container). The title keeps both forms in view
  // when the pad goes full screen over the answer.
  if (practice) practice.addEventListener('toggle', () => {
    if (practice.open && !session.practicePad) {
      const lemma = lemmaText(card.item), form = tokText(BOOK.tokens.get(card.token));
      const titleHTML = `Copy ${heb(lemma, 'pad-heb')}${form !== lemma ? ` or ${heb(form, 'pad-heb')}` : ''}`;
      session.practicePad = createPad($('#practicehost'), { titleHTML, height: 190 });
    }
  });

  const reveal = $('#reveal');
  if (reveal) reveal.onclick = doReveal;
  const hint = $('#hint');
  if (hint) hint.onclick = () => {
    captureSketch();
    if (session.hints < ladder.length) session.hints++;
    else { session.hints = Math.max(session.hints, 2); session.revealed = true; }
    renderStudy();
  };
  const hide = $('#hidepad');
  if (hide) hide.onclick = e => { e.preventDefault(); dropPad(); session.sketch = null; state.settings.showPad = false; persist(); renderStudy(); };
  const show = $('#showpad');
  if (show) show.onclick = e => { e.preventDefault(); state.settings.showPad = true; persist(); renderStudy(); };
  view.querySelectorAll('[data-grade]').forEach(b => { b.onclick = () => onGrade(Number(b.dataset.grade)); });
  view.querySelectorAll('[data-pick]').forEach(b => {
    b.onclick = () => {
      if (session.revealed) return;
      session.picked = b.dataset.pick;
      session.revealed = true;
      const right = session.picked === card.item.id;
      session.whichStreak = right ? session.whichStreak + 1 : 0;
      renderStudy(); // a right pick counts as Got it, a wrong pick as Not yet
      // Which word? is graded by the app, not by you, so a run of right picks can earn a spark honestly.
      if (right && session.whichStreak >= 3 && session.whichStreak % 3 === 0) celebrate(`${session.whichStreak} in a row`, `${session.whichStreak} right in a row`, 'spark');
    };
  });
}

function renderWrapUp() {
  const view = $('#view');
  const after = stagesByItem(DECK, cardState);
  const diff = stageDiff(session.stagesBefore || after, after);
  const day = store.todayKey();
  state.snapshots[day] = buildSnapshot(countStages(after), DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id)));
  state.snapshots = pruneSnapshots(state.snapshots, day);
  persist();
  const next = DECK.filter(c => writeOn(c) && !isNew(c.id)).map(c => cardState(c.id).due).sort((a, b) => a - b)[0];
  const names = ids => ids.length ? `<ul class="moved">${ids.map(id => { const l = BOOK.lexemes.get(id); return `<li>${heb(lemmaText(l))} ${esc(l.gloss)}</li>`; }).join('')}</ul>` : '';
  const tile = (n, label, ids) => `<div class="stat"><b>${n}</b><span>${label}</span>${names(ids)}</div>`;
  const meetLine = session.counts && session.counts.meet ? `<p class="meet-stars">Meet ${starsHTML(meetStarsNow())}</p>` : '';
  view.innerHTML = `<div class="card done"><h2>Session done</h2><div class="big">${session.done}</div><p class="muted">cards answered</p>${meetLine}
    <div class="stats moved-stats">${tile(diff.met.length, diff.met.length === 1 ? 'word met' : 'words met', diff.met)}${tile(diff.graduated.length, 'graduated', diff.graduated)}${tile(diff.solid.length, 'now solid', diff.solid)}</div>
    <div class="pipeline-wrap">${pipelineHTML(countStages(after))}</div>
    <p style="margin-top:14px">${next ? `Next cards come due ${fmtDue(next)}.` : ''} Coming back tomorrow matters more than doing more today. Spacing is a big part of what makes this stick.</p>
    ${moreButtonsHTML()}</div>`;
  wireMoreButtons();
}

function onKey(e) {
  if (route !== 'today') return;
  if ((session.pad && session.pad.isExpanded()) || (session.practicePad && session.practicePad.isExpanded())) return; // the full-screen pad is for writing; Escape closes it
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && /^(input|select|textarea|button|a)$/i.test(e.target.tagName)) return;
  const card = session.current;
  if (!card) return;
  if (!session.revealed) {
    if (card.kind === 'which' && /^[1-4]$/.test(e.key)) { const b = $(`#view .choice:nth-child(${e.key})`); if (b) b.click(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const b = $('#reveal'); if (b) b.click(); }
    else if (e.key === 'h' || e.key === 'H') { const b = $('#hint'); if (b) b.click(); }
    return;
  }
  const autoBtn = $('#view [data-auto]');
  if (card.kind === 'which' || autoBtn) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const b = autoBtn || $('#view [data-grade]'); if (b) b.click(); }
    return;
  }
  const nb = state.settings.gradeButtons;
  const map = nb === 2 ? { 1: 1, 2: 3 } : nb === 3 ? { 1: 1, 2: 2, 3: 3 } : { 1: 1, 2: 2, 3: 3, 4: 4 };
  if (map[e.key]) { const b = $(`#view [data-grade="${map[e.key]}"]`); if (b && !b.disabled) b.click(); }
}

/* ───────────────────────── read ───────────────────────── */

const reader = { glosses: false, stages: true };

function coverage(verses) {
  let total = 0, known = 0;
  for (const v of verses) for (const t of v.t) {
    if (t.kq === 'k' && t.pair && t.pair.length) continue; // count each place once
    const l = BOOK.lexemes.get(t.lex);
    if (!l || l.affix || l.name) continue;
    total++;
    const s = stageOfLex(t.lex);
    if (s === 'graduated' || s === 'solid') known++;
  }
  return { total, known, pct: total ? Math.round(known / total * 100) : 0 };
}

function renderRead(param) {
  const view = $('#view');
  let chapter = 1, focus = null;
  if (param) {
    const [c, v] = param.split('.').map(Number);
    if (BOOK.chapters.includes(c)) chapter = c;
    if (v && BOOK.verses.has(`${c}.${v}`)) focus = `${c}.${v}`;
  }
  const verses = BOOK_DATA.verses.filter(v => v.c === chapter);
  const cov = coverage(verses);
  const o = { tappable: true, glosses: reader.glosses, stages: reader.stages };
  view.innerHTML = `<h1>Read ${esc(BOOK_NAME)}</h1>
    <p class="lead">Read a verse, then tap any word you are unsure of. Words are underlined by how well you know them.</p>
    <div class="panel read-bar">
      <div class="seg chapters" role="group" aria-label="Chapter">${BOOK.chapters.map(c => `<a href="#read/${c}" class="${c === chapter ? 'on' : ''}" aria-current="${c === chapter ? 'page' : 'false'}">${c}</a>`).join('')}</div>
      <p class="listen"><a class="btn btn-small" href="${haktuvimURL(chapter)}" target="_blank" rel="noopener">Listen to chapter ${chapter} on Haktuvim</a> <span class="small muted">The Bible Society in Israel's site, with a native reader's recording.</span></p>
      <div class="row toggles">
        <label class="tog"><input type="checkbox" id="tg-gloss" ${reader.glosses ? 'checked' : ''}> Glosses under words</label>
        <label class="tog"><input type="checkbox" id="tg-stage" ${reader.stages ? 'checked' : ''}> Show what I know</label>
      </div>
      <p class="small">Words you have graduated cover <b>${cov.pct}%</b> of chapter ${chapter} (${cov.known} of ${cov.total} running words, names and prefixes aside).
        <button class="linkish" id="pick">Pick a verse for me</button></p>
      <p class="small legend"><span class="w st-new"><span class="wt">new</span></span> <span class="w st-learning"><span class="wt">learning</span></span> <span class="w st-graduated"><span class="wt">graduated</span></span> <span class="w st-solid"><span class="wt">solid</span></span> · <a href="#kq">Written and read: ${BOOK_DATA.kq.length} places</a></p>
    </div>
    <div class="reader size-${state.settings.hebSize}">${verses.map(v => `<div class="vblock" id="v-${v.ref}"><a class="vnum" href="#read/${v.ref}" aria-label="${esc(refLabel(v.ref))}">${v.v}</a>${verseHTML(v, o)}</div>`).join('')}</div>
    <div class="row" style="justify-content:space-between">${chapter > 1 ? `<a class="btn btn-quiet" href="#read/${chapter - 1}">Chapter ${chapter - 1}</a>` : '<span></span>'}${chapter < BOOK.chapters.length ? `<a class="btn" href="#read/${chapter + 1}">Chapter ${chapter + 1}</a>` : ''}</div>
    <aside id="sheet" class="sheet" hidden></aside>`;
  $('#tg-gloss').onchange = e => { reader.glosses = e.target.checked; renderRead(param); };
  $('#tg-stage').onchange = e => { reader.stages = e.target.checked; renderRead(param); };
  $('#pick').onclick = () => {
    const scored = verses.map(v => ({ v, c: coverage([v]) })).filter(x => x.c.pct < 100 || x.c.total === 0);
    const best = (scored.length ? scored : verses.map(v => ({ v, c: coverage([v]) }))).sort((a, b) => b.c.pct - a.c.pct)[0];
    reader.glosses = false;
    location.hash = `#read/${best.v.ref}`;
  };
  view.querySelectorAll('[data-tok]').forEach(b => b.onclick = () => openSheet(b.dataset.tok));
  if (focus) {
    const el = document.getElementById(`v-${focus}`);
    if (el) { el.classList.add('focus'); el.tabIndex = -1; setTimeout(() => { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }, 0); }
  }
}

function kqNote(t) {
  const place = BOOK_DATA.kq.find(e => e.k === t.id || e.q.includes(t.id));
  if (!place) return '';
  const k = place.k ? BOOK.tokens.get(place.k) : null;
  const qs = place.q.map(id => BOOK.tokens.get(id));
  const row = (label, x) => x ? `<li><span class="lbl">${label}</span>${heb(label === 'Written' ? x.c : x.p, 'mid')} <b class="en">${esc(x.en)}</b> <span class="muted">${esc(shortParse(x.parse))}</span></li>` : `<li><span class="lbl">${label}</span><span class="muted">nothing ${label === 'Written' ? 'written' : 'read'} here</span></li>`;
  return `<div class="kqbox"><b>Written and read differ here</b> <span class="muted">(${esc(place.diff.join(', '))})</span>
    <ul>${row('Written', k)}${qs.length ? qs.map(q => row('Read', q)).join('') : row('Read', null)}</ul>${place.note ? `<p class="small">${esc(place.note)}</p>` : ''}</div>`;
}

function openSheet(id) {
  const t = BOOK.tokens.get(id);
  const sheet = $('#sheet');
  if (!t || !sheet) return;
  const l = BOOK.lexemes.get(t.lex);
  const v = BOOK.verseOf.get(id);
  const stage = stageOfLex(t.lex);
  sheet.innerHTML = `<div class="sheet-in"><button class="btn btn-small sheet-x" aria-label="Close">Close</button>
    ${formHTML(t)}
    ${t.gl ? `<p class="small">In this verse: <b>${esc(t.gl.gloss)}</b> <span class="muted">(${esc(t.gl.source)})</span></p>` : ''}
    ${kqNote(t)}
    <h3>Dictionary word ${stage !== 'known' ? `<span class="chip chip-stage-${stage}">${STAGE_LABEL[stage]}</span>` : ''}</h3>
    ${l.name ? `<p>${heb(lemmaText(l), 'mid')} <b>${esc(l.gloss)}</b> <span class="muted">${esc(nameKind(l))}, ${l.n}×</span> · <a href="#names">Names</a></p>` : `${wordSummaryHTML(l)}${lookalikeHTML(l)}<p class="links"><a href="#words/${l.id}">All its forms</a></p>`}
    <p class="links">${esc(refLabel(v.ref))}: ${verseLinks(v.ref)}</p></div>`;
  sheet.hidden = false;
  document.body.classList.add('sheet-open');
  $('.sheet-x', sheet).onclick = () => { sheet.hidden = true; document.body.classList.remove('sheet-open'); };
}

/* ───────────────────────── written and read ───────────────────────── */

function renderKq() {
  const view = $('#view');
  const items = BOOK_DATA.kq.map((e, i) => {
    const v = BOOK.verses.get(e.ref);
    const k = e.k ? BOOK.tokens.get(e.k) : null;
    const qs = e.q.map(id => BOOK.tokens.get(id));
    const hl = (k || qs[0]).id;
    const reading = (label, x, text) => x
      ? `<div class="reading"><span class="lbl">${label}</span>${heb(text, 'mid')}<b class="en">${esc(x.en)}</b><span class="muted">${esc(x.parse)} · ${bdbCite(BOOK.lexemes.get(x.lex))}</span></div>`
      : `<div class="reading"><span class="lbl">${label}</span><span class="muted">nothing ${label === 'Written (ketiv)' ? 'written' : 'read'} here</span></div>`;
    return `<li class="panel kqitem"><div class="row"><b>${esc(refLabel(e.ref))}</b><span class="spacer"></span><span class="chip chip-kq">${esc(e.diff.join(', '))}</span></div>
      ${verseHTML(v, { highlight: hl })}
      <details><summary>Work out both readings, then check</summary>
        ${reading('Written (ketiv)', k, k ? k.c : '')}
        ${qs.length ? qs.map(q => reading('Read (qere)', q, pointed() ? q.p : q.c)).join('') : reading('Read (qere)', null, '')}
        ${e.note ? `<p class="small kqnote">${esc(e.note)}</p>` : ''}
        <p class="links"><a href="#read/${e.ref}">Read it in context</a><span class="sep"> · </span>${verseLinks(e.ref)}</p>
      </details></li>`;
  }).join('');
  view.innerHTML = `<h1>Written and read</h1>
    <p class="lead">In ${BOOK_DATA.kq.length} places in ${esc(BOOK_NAME)} the consonants as written (ketiv, כְּתִיב) and the text as read (qere, קְרֵי) differ. Both are kept here, each with its own parse and dictionary word. Neither is presented as the correct one; the tag says only what differs.</p>
    <p class="small muted">Parses follow the Open Scriptures Hebrew Bible's tagging, which is one reading of each form. The written forms carry no vowels in the Leningrad Codex, so their parse is an interpretation of consonants.</p>
    ${PARSE_KEY}
    <ul class="kqlist">${items}</ul>`;
}

/* ───────────────────────── words and names ───────────────────────── */

const wordsUi = { q: '', sort: 'order', ch: 0 };

function renderWords(param) {
  if (param) { wordsUi.q = ''; wordsUi.ch = 0; } // a deep link must not be hidden by earlier filters
  const view = $('#view');
  const st = stages();
  const list = () => {
    const q = wordsUi.q.trim().toLowerCase();
    const qh = plain(wordsUi.q.trim());
    let items = BOOK.vocab.filter(l => (!wordsUi.ch || BOOK.chapterOf(l.first) === wordsUi.ch)
      && (!q || l.gloss.toLowerCase().includes(q) || (l.def || '').toLowerCase().includes(q) || (qh && plain(l.he).includes(qh))));
    if (wordsUi.sort === 'freq') items = items.slice().sort((a, b) => b.n - a.n || a.order - b.order);
    if (wordsUi.sort === 'heb') items = items.slice().sort((a, b) => plain(a.he).localeCompare(plain(b.he), 'he'));
    if (!items.length) return '<p class="muted">No words match.</p>';
    return `<ul class="flist words">${items.map(l => {
      const s = st.get(l.id) || 'new';
      return `<li id="w-${l.id}"><details${param === l.id ? ' open' : ''}><summary><span class="wrow">${heb(lemmaText(l), 'mid')}<span class="wg"><b>${esc(l.gloss)}</b> <span class="muted">${esc(posLabel(l.pos))} · ${l.n}×</span></span><span class="chip chip-stage-${s}">${STAGE_LABEL[s]}</span></span></summary>
        <div class="wbody"><p class="small">${bdbCite(l)}${l.tr ? ` · ${esc(l.tr)}` : ''} · first in ${esc(l.first.replace('.', ':'))}</p>${lookalikeHTML(l)}${glossNote(l)}${formsListHTML(l, 50)}</div></details></li>`;
    }).join('')}</ul>`;
  };
  view.innerHTML = `<h1>Words in ${esc(BOOK_NAME)}</h1><p class="lead">All ${BOOK.vocab.length} words the cards teach, in the order they are introduced. Names have <a href="#names">their own list</a>; prefixes and suffixes are explained when you tap a word in Read.</p>
    <div class="row filters"><input class="search" id="q" type="search" placeholder="Search English or Hebrew" aria-label="Search words" value="${esc(wordsUi.q)}">
      <select id="sort" aria-label="Sort"><option value="order">Order introduced</option><option value="freq">Most frequent</option><option value="heb">Hebrew A–Z</option></select>
      <select id="ch" aria-label="Chapter"><option value="0">All chapters</option>${BOOK.chapters.map(c => `<option value="${c}">First in chapter ${c}</option>`).join('')}</select></div>
    ${PARSE_KEY}
    <div class="panel" id="wl">${list()}</div>`;
  $('#sort').value = wordsUi.sort; $('#ch').value = String(wordsUi.ch);
  $('#q').oninput = e => { wordsUi.q = e.target.value; $('#wl').innerHTML = list(); };
  $('#sort').onchange = e => { wordsUi.sort = e.target.value; $('#wl').innerHTML = list(); };
  $('#ch').onchange = e => { wordsUi.ch = Number(e.target.value); $('#wl').innerHTML = list(); };
  if (param) { const el = document.getElementById(`w-${param}`); if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 0); }
}

function renderNames() {
  const view = $('#view');
  view.innerHTML = `<h1>Names in ${esc(BOOK_NAME)}</h1><p class="lead">People, places and peoples, kept apart from the vocabulary cards. Tap a reference to read it.</p>
    <div class="panel"><ul class="flist names">${BOOK.names.map(l => {
      const toks = (l.occ || []).map(id => BOOK.tokens.get(id));
      const refs = [...new Set(toks.map(t => t.ref))];
      return `<li><div class="wrow">${heb(lemmaText(l), 'mid')}<span class="wg"><b>${esc(l.gloss)}</b> <span class="muted">${esc(nameKind(l))} · ${l.n}×</span></span></div>
        <p class="small refs-inline">${refs.map(r => `<a href="#read/${r}">${esc(r.replace('.', ':'))}</a>`).join(', ')}</p></li>`;
    }).join('')}</ul></div>`;
}

/* ───────────────────────── progress ───────────────────────── */

function streak() {
  let n = 0; const d = new Date();
  if (!state.sessions[store.todayKey(d)]) d.setDate(d.getDate() - 1);
  while (state.sessions[store.todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function pipelineHTML(counts) {
  const tiles = STAGES.map(s => `<div class="stage st-${s}"><b>${counts[s]}</b><span>${STAGE_LABEL[s]}</span></div>`).join('');
  const bar = STAGES.map(s => counts[s] ? `<i class="st-${s}" style="flex:${counts[s]}" title="${STAGE_LABEL[s]}: ${counts[s]}"></i>` : '').join('');
  return `<div class="stages">${tiles}</div><div class="pipe" role="img" aria-label="${STAGES.map(s => `${STAGE_LABEL[s]} ${counts[s]}`).join(', ')}">${bar}</div>`;
}

function momentumHTML(at) {
  const days = [...Array(14)].map((_, i) => { const d = new Date(at); d.setDate(d.getDate() - (13 - i)); return store.todayKey(d); });
  const vals = days.map(k => state.sessions[k] || 0);
  const max = Math.max(1, ...vals);
  const fmt = k => { const [, m, d] = k.split('-'); return `${Number(m)}/${Number(d)}`; };
  const bars = `<div class="spark" role="img" aria-label="Reviews per day over the last 14 days: ${vals.join(', ')}">${vals.map((v, i) =>
    `<i class="${v ? '' : 'zero'}" style="height:${Math.max(4, Math.round(v / max * 100))}%" title="${days[i]}: ${v}"></i>`).join('')}</div>
    <div class="spark-axis muted"><span>${fmt(days[0])}</span><span>today</span></div>`;
  const reviewCards = DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id)).filter(c => c.state === State.Review);
  let line = '';
  if (reviewCards.length) {
    const nowAvg = buildSnapshot({}, reviewCards).avgInterval;
    const weekAgo = new Date(at); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(at); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const key7 = store.todayKey(weekAgo), key14 = store.todayKey(twoWeeksAgo);
    const pastKey = Object.keys(state.snapshots || {}).filter(k => k <= key7 && k >= key14).sort().pop();
    const past = pastKey ? state.snapshots[pastKey]?.avgInterval : null;
    const then = past === null || past === undefined ? NaN : Number(past);
    line = Number.isFinite(then)
      ? `Review cards now come back every ${nowAvg} days on average, ${nowAvg > then ? 'up from' : nowAvg < then ? 'down from' : 'the same as'} ${esc(String(then))} a week ago.`
      : `Review cards now come back every ${nowAvg} days on average. Check back next week to see the gap grow.`;
  }
  return `${bars}${line ? `<p class="small" style="margin-top:10px">${line}</p>` : ''}`;
}

function renderProgress() {
  const view = $('#view');
  const at = now();
  const seen = DECK.filter(c => !isNew(c.id));
  const learned = seen.filter(c => cardState(c.id).state === State.Review);
  const due = dueCards(at).length;
  const today = state.sessions[store.todayKey()] || 0;
  const st = stages();
  const counts = countStages(st);
  const cov = coverage(BOOK_DATA.verses);

  const chapterBars = BOOK.chapters.map(c => {
    const all = BOOK.vocab.filter(l => BOOK.chapterOf(l.first) === c);
    const done = all.filter(l => ['graduated', 'solid'].includes(st.get(l.id)));
    const cc = coverage(BOOK_DATA.verses.filter(v => v.c === c));
    return `<div class="bar"><span>Chapter ${c}</span><span class="track"><i style="width:${cc.pct}%"></i></span><span class="muted">${cc.pct}% · ${done.length}/${all.length} new words</span></div>`;
  }).join('');

  const rows = BOOK.vocab.map(l => {
    const cards = DECK.filter(c => c.item.id === l.id && !isNew(c.id));
    if (!cards.length) return { l, r: null };
    const rs = cards.map(c => retrievability(scheduler, cardState(c.id), at)).filter(x => x !== null);
    return { l, r: rs.length ? Math.min(...rs) : null };
  }).filter(x => x.r !== null).sort((a, b) => a.r - b.r).slice(0, 40);

  view.innerHTML = `<h1>Progress</h1>
    <div class="panel"><h2>Reading ${esc(BOOK_NAME)}</h2><p>Words you have graduated cover <b>${cov.pct}%</b> of the book's running text (${cov.known} of ${cov.total} words, names and prefixes aside).</p>
      <div class="bars">${chapterBars}</div></div>
    <div class="panel"><h2>Where your words are</h2>${pipelineHTML(counts)}
      <p class="small muted" style="margin-top:10px">A word is <b>Learning</b> once you have met it, <b>Graduated</b> after three correct recalls, and <b>Solid</b> when it comes back a week or more apart and you can pick it out in a verse among look-alikes.</p></div>
    <div class="panel"><div class="stats">
      <div class="stat"><b>${due}</b><span>due now</span></div>
      <div class="stat"><b>${learned.length}</b><span>of ${DECK.length} cards learned</span></div>
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${today}</b><span>answered today</span></div>
      <div class="stat"><b>${seen.length - learned.length}</b><span>still learning</span></div>
      <div class="stat"><b>${DECK.length - seen.length}</b><span>not seen yet</span></div>
    </div></div>
    <div class="panel"><h2>Momentum</h2><p class="small muted">Reviews per day. The gap between reviews grows as words get stronger, so the same deck takes less time each week.</p>${momentumHTML(at)}</div>
    <div class="panel"><h2>Predicted recall right now</h2><p class="small muted">The scheduler's estimate of the chance you would recall each word if asked this minute, weakest first (up to 40).</p>
    ${rows.length ? `<ul class="flist">${rows.map(({ l, r }) => `<li class="recall-row"><span class="name">${heb(lemmaText(l))} ${esc(l.gloss)} <span class="chip chip-stage-${st.get(l.id)}">${STAGE_LABEL[st.get(l.id)]}</span></span><span class="recall"><b>${Math.round(r * 100)}%</b></span></li>`).join('')}</ul>` : '<p class="muted">Nothing studied yet.</p>'}</div>`;
}

/* ───────────────────────── settings ───────────────────────── */

function renderSettings() {
  const view = $('#view');
  const s = state.settings;
  const srcs = BOOK_DATA.sources.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>. ${esc(x.licence)}. Credit: ${esc(x.credit)}. Pinned at commit <code>${esc(x.commit.slice(0, 7))}</code>.</li>`).join('');
  view.innerHTML = `<h1>Settings</h1>
    <div class="panel">
      <div class="field"><label for="npd">New words per day</label><span class="help">Each new word arrives as two cards (the word, then the word in its verse). The same number caps new practice cards for words you already know. ${BOOK.vocab.length} words at 10 a day takes about ${Math.ceil(BOOK.vocab.length / 10)} days.</span>
        <select id="npd">${[3, 5, 10, 15, 20].map(n => `<option value="${n}" ${s.newPerDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Hebrew text</label><span class="help">Pointed shows the vowel points. Unpointed shows consonants only, as a scroll would; in places where the written and read text differ it leads with the written consonants.</span>
        <div class="seg" role="group"><button data-pt="pointed" aria-pressed="${s.pointing === 'pointed'}">Pointed</button><button data-pt="unpointed" aria-pressed="${s.pointing === 'unpointed'}">Unpointed</button></div></div>
      <div class="field"><label>Hebrew size</label>
        <div class="seg" role="group">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, n]) => `<button data-hs="${k}" aria-pressed="${s.hebSize === k}">${n}</button>`).join('')}</div></div>
      <div class="field"><label>Grading buttons</label><span class="help">Partly records progress without perfection: the card keeps the ground it has gained instead of starting over, and comes back sooner than after Got it. Easy pushes a card out further than most memories have earned, so it is off by default.</span>
        <div class="seg" role="group"><button data-gb="2" aria-pressed="${s.gradeButtons === 2}">Not yet / Got it</button><button data-gb="3" aria-pressed="${s.gradeButtons === 3}">+ Partly</button><button data-gb="4" aria-pressed="${s.gradeButtons === 4}">+ Easy</button></div></div>
      <div class="field"><label>Writing pad</label><span class="help">A space under each question to write your answer by finger, stylus or mouse. Writing keeps self-grading honest.</span>
        <div class="seg" role="group"><button data-pad="1" aria-pressed="${s.showPad}">Show</button><button data-pad="0" aria-pressed="${!s.showPad}">Hide</button></div></div>
      <div class="field"><label for="wa">Write the Hebrew</label><span class="help">Once you have read a word in its verse this many times (in-verse and other-form cards, right or wrong), a card blanks it in its verse and asks you to write the Hebrew on the pad. Off removes these cards, including ones already started.</span>
        <select id="wa">${[[1, 'After 1 view in its verse'], [2, 'After 2 views'], [3, 'After 3 views'], [5, 'After 5 views'], [0, 'Off']].map(([n, l]) => `<option value="${n}" ${s.writeAfter === n ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="help">Write its dictionary form, or the word as it stands in the verse. The answer shows both.</span>
        <div class="seg" role="group"><button data-wf="lemma" aria-pressed="${s.writeForm === 'lemma'}">Dictionary form</button><button data-wf="verse" aria-pressed="${s.writeForm === 'verse'}">As in the verse</button></div></div>
    </div>
    <div class="panel"><h2>Your progress</h2><p class="small muted">Progress is saved in this browser only. Export it to move to another phone or laptop, or as a backup.</p>
      <div class="actions"><button class="btn" id="export">Export progress</button><label class="btn file-btn">Import progress<input type="file" id="import" accept="application/json,.json"></label><button class="btn danger" id="reset">Start over</button></div></div>
    <div class="panel"><h2>Sources</h2><ul class="small srcs">${srcs}
      <li>Hebrew type: <a href="https://github.com/notofonts/hebrew" target="_blank" rel="noopener">Noto Serif Hebrew</a>, SIL Open Font License 1.1.</li>
      <li>Scheduling: <a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener">ts-fsrs</a> (MIT).</li></ul>
      <p class="small muted">Glosses are TBESH's short glosses, shortened to their general sense (the part before TBESH's colon). TBESH's longer definitions are not used. Cantillation marks are not shown.</p></div>`;

  const save = () => { scheduler = makeScheduler(state.settings); persist(); toast('Saved'); };
  $('#npd').onchange = e => { s.newPerDay = Number(e.target.value); save(); };
  view.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { s.pointing = b.dataset.pt; save(); renderSettings(); });
  view.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => { s.hebSize = b.dataset.hs; applyHebSize(); save(); renderSettings(); });
  view.querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { s.gradeButtons = Number(b.dataset.gb); save(); renderSettings(); });
  view.querySelectorAll('[data-pad]').forEach(b => b.onclick = () => { s.showPad = b.dataset.pad === '1'; save(); renderSettings(); });
  $('#wa').onchange = e => {
    s.writeAfter = Number(e.target.value);
    if (!s.writeAfter) {
      const before = session.queue.length;
      session.queue = session.queue.filter(writeOn);
      session.total -= before - session.queue.length;
      if (session.current && !writeOn(session.current)) { session.current = null; session.total--; }
    }
    save();
  };
  view.querySelectorAll('[data-wf]').forEach(b => b.onclick = () => { s.writeForm = b.dataset.wf; save(); renderSettings(); });
  $('#export').onclick = () => {
    const blob = new Blob([store.exportState(state)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hebrew-by-book-progress-${store.todayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { state = store.importState(await file.text()); scheduler = makeScheduler(state.settings); invalidateStages(); resetSession(); applyHebSize(); persist(); toast('Progress imported'); renderSettings(); }
    catch (err) { toast(err.message || 'Could not read that file'); }
  };
  $('#reset').onclick = () => {
    if (confirm('Erase all progress on this device? Export first if you want a backup.')) { state = store.resetState(); scheduler = makeScheduler(state.settings); invalidateStages(); resetSession(); applyHebSize(); toast('Progress cleared'); renderSettings(); }
  };
}

function applyHebSize() {
  document.documentElement.dataset.hebSize = state.settings.hebSize;
}

/* ───────────────────────── how it works ───────────────────────── */

function renderMethod() {
  const view = $('#view');
  const first = !state.settings.introSeen;
  view.innerHTML = methodHTML({ firstVisit: first, wordCount: BOOK.vocab.length, bookName: BOOK_NAME });
  if (first) { state.settings.introSeen = true; store.saveState(state); }
}

/* ───────────────────────── routing ───────────────────────── */

// Coming back to Today the same day continues the session instead of rebuilding it.
// A finished session picks up any cards that have come due since the wrap-up.
function resumeOrStart() {
  const sameDay = session.day === store.todayKey();
  if (!sameDay) { startSession(); return; }
  if (session.current || session.queue.length) { renderStudy(); return; }
  const fresh = dueCards().filter(c => writeOn(c) && !isNew(c.id));
  if (fresh.length) {
    session.queue.push(...fresh);
    session.total += fresh.length;
    if (session.phaseOf) fresh.forEach(c => { if (!session.phaseOf.has(c.id)) session.phaseOf.set(c.id, c.kind === 'which' ? 'tell' : 'recall'); });
  }
  renderStudy();
}

let route = 'today';
function navigate() {
  const raw = (location.hash || '#today').slice(1);
  let [hash, param] = raw.split('/');
  const views = ['today', 'read', 'kq', 'words', 'names', 'progress', 'method', 'settings'];
  if (!views.includes(hash)) hash = 'today';
  // First visit: explain the method before the first card.
  if (!state.settings.introSeen && hash === 'today') { hash = 'method'; try { history.replaceState(null, '', '#method'); } catch (e) { /* ignore */ } }
  route = hash;
  const tab = hash === 'kq' ? 'read' : hash;
  document.querySelectorAll('.tabs a').forEach(a => { if (a.dataset.view === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  scheduler = makeScheduler(state.settings);
  dropPad();
  invalidateStages();
  document.body.classList.remove('sheet-open');
  if (route === 'today') resumeOrStart();
  else if (route === 'read') renderRead(param);
  else if (route === 'kq') renderKq();
  else if (route === 'words') renderWords(param);
  else if (route === 'names') renderNames();
  else if (route === 'progress') renderProgress();
  else if (route === 'method') renderMethod();
  else renderSettings();
  if (!(route === 'read' && param && param.includes('.')) && !(route === 'words' && param)) window.scrollTo({ top: 0 });
}

/* ───────────────────────── debug links ───────────────────────── */

// ?debug=<scenario>[&words=N][&card=<id>][&reps=N][&reveal=1][&practice=1]
const DEBUG_SCENARIOS = {
  fresh: 'a first visit (How it works first)',
  today: 'a new day, nothing met yet',
  done: 'the end of a day: words met, then the finished-day buttons',
  write: 'a Write the Hebrew card for the first word met',
  card: 'one card by id, e.g. &card=H559:ctx',
};
const DEBUG_HELP = 'words=N words already met (default 10); reps=N shows the card at its Nth review (its Nth verse); reveal=1 shows the answer; practice=1 also opens Practice?';

// Before the first route: met words, graded Got it three times on each Meet card, as a real day would.
function debugSeed() {
  if (!DEBUG || DEBUG === 'fresh') return;
  state.settings.introSeen = true;
  const words = DEBUG === 'today' ? 0 : Math.max(0, Number(DEBUG_PARAMS.get('words') ?? 10) || 0);
  state.dayStart = { day: store.todayKey(), stages: [...stagesByItem(DECK, cardState)] };
  for (const l of BOOK.vocab.slice(0, words)) for (const kind of ['recall', 'ctx']) {
    const c = DECK.find(x => x.id === `${l.id}:${kind}`);
    if (c) for (let i = 0; i < 3; i++) applyGrade(c, 3);
  }
  invalidateStages();
  persist();
  try { history.replaceState(null, '', `${location.search}#today`); } catch (e) { /* ignore */ }
}

// After the first route: put the asked-for screen in place of the day's session.
function debugView() {
  if (!DEBUG || DEBUG === 'fresh' || DEBUG === 'today') return;
  const reveal = DEBUG_PARAMS.get('reveal') === '1' || DEBUG_PARAMS.get('practice') === '1';
  let cards = [];
  if (DEBUG === 'done') {
    dropPad();
    Object.assign(session, { queue: [], current: null, done: Math.max(1, session.done) });
    renderStudy();
    return;
  }
  if (DEBUG === 'write') cards = DECK.filter(c => c.kind === 'write' && c.item.id === BOOK.vocab[0].id);
  if (DEBUG === 'card') cards = DECK.filter(c => c.id === DEBUG_PARAMS.get('card'));
  if (!cards.length) { toast('Debug: no such card'); return; }
  dropPad();
  Object.assign(session, { queue: [], done: 0, total: 1, revealed: false });
  const reps = DEBUG_PARAMS.get('reps');
  session.writeForm = state.settings.writeForm;
  session.current = variantFor(cards[0], reps != null ? Number(reps) || 0 : (cardState(cards[0].id) || {}).reps || 0);
  session.revealed = reveal;
  renderStudy();
  const d = $('#view details.practice');
  if (d && DEBUG_PARAMS.get('practice') === '1') d.open = true;
}

function debugBanner() {
  if (!DEBUG) return;
  const known = DEBUG in DEBUG_SCENARIOS;
  const bar = document.createElement('div');
  bar.className = 'debug-bar';
  bar.setAttribute('role', 'note');
  bar.innerHTML = `<b>Debug: ${esc(DEBUG)}</b>${known ? ` (${esc(DEBUG_SCENARIOS[DEBUG])})` : ' is not a scenario'}. Scratch progress, wiped on reload. <a href="${esc(location.pathname)}">Leave debug</a>
    ${known ? '' : `<ul>${Object.entries(DEBUG_SCENARIOS).map(([k, v]) => `<li><a href="?debug=${k}">${k}</a>: ${esc(v)}</li>`).join('')}</ul><p>${esc(DEBUG_HELP)}</p>`}`;
  document.body.prepend(bar);
}

applyHebSize();
window.addEventListener('hashchange', navigate);
document.addEventListener('keydown', onKey);
debugBanner();
debugSeed();
// The first visit leaves #method in the address, and a bookmark, home-screen icon or restored tab keeps it, so
// every later load opened How it works (Steve, 2026-10-24). Once it has been seen, a fresh load opens Today;
// the How tab still opens it on demand.
if (state.settings.introSeen && location.hash === '#method') {
  try { history.replaceState(null, '', '#today'); } catch (e) { /* ignore */ }
}
navigate();
debugView();
