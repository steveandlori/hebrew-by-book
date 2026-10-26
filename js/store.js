// Progress and settings live in the browser (localStorage). Export/import moves them between devices.

let KEY = 'hebrew-by-book-v1';
const SCRATCH_KEY = 'hebrew-by-book-debug';
const APP = 'hebrew-by-book';

const DEFAULT_SETTINGS = {
  newPerDay: 10,     // new words a day (each is met as two cards); also caps new deepen/tell-apart cards
  gradeButtons: 3,   // 2 = Not yet / Got it; 3 adds Partly; 4 adds Easy
  retention: 0.9,
  pointing: 'pointed', // 'pointed' (niqqud) or 'unpointed' (consonants only, as on a scroll)
  hebSize: 'm',        // Hebrew text size: s, m, l
  introSeen: false,  // How it works shown once on first visit
  showPad: true,     // writing pad under recall prompts
  writeForm: 'lemma', // Write-the-Hebrew cards ask for the dictionary form ('lemma') or the form in the verse ('verse')
  writeAfter: 2,       // in-verse views that unlock a word's Write the Hebrew card; 0 = off
};

function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (![2, 3, 4].includes(s.gradeButtons)) s.gradeButtons = 3;
  if (!['pointed', 'unpointed'].includes(s.pointing)) s.pointing = 'pointed';
  if (!['s', 'm', 'l'].includes(s.hebSize)) s.hebSize = 'm';
  if (!['lemma', 'verse'].includes(s.writeForm)) s.writeForm = 'lemma';
  if (![0, 1, 2, 3, 5].includes(s.writeAfter)) s.writeAfter = DEFAULT_SETTINGS.writeAfter;
  if (!(Number(s.newPerDay) > 0)) s.newPerDay = DEFAULT_SETTINGS.newPerDay;
  return s;
}

// The study day runs from 4 am to 4 am, as in Anki, so a late-night session counts as the same day
// (2026-10-25; the hour is Steve's to change). Every day key and "due today" goes through these.
const DAY_ROLLOVER_HOUR = 4;
const HOUR = 3600000;

function todayKey(d = new Date()) {
  const s = new Date(d.getTime() - DAY_ROLLOVER_HOUR * HOUR);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

// The start of the study day `d` falls in (the last rollover at or before it), and its end (the next one).
function dayStartAt(d = new Date()) {
  const s = new Date(d.getTime() - DAY_ROLLOVER_HOUR * HOUR);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate(), DAY_ROLLOVER_HOUR);
}
function dayEnd(d = new Date()) {
  const s = dayStartAt(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, DAY_ROLLOVER_HOUR);
}

function shape(s) {
  return {
    settings: normalizeSettings(s.settings),
    cards: s.cards || {},          // cardId -> fsrs card (dates as ISO strings)
    log: s.log || [],              // {id, rating, at, hints}
    newIntroduced: s.newIntroduced || {}, // dayKey -> [cardIds]
    sessions: s.sessions || {},    // dayKey -> count of reviews
    snapshots: s.snapshots || {},  // dayKey -> {stages, avgInterval}, written at wrap-up
    meetDay: s.meetDay || null,    // today's Meet progress {day, ids, steps, stars}, so stars survive a reload
    dayStart: s.dayStart || null,  // {day, stages: [[wordId, stage]]} at the day's first session, for the wrap-up
    moreWords: s.moreWords || null, // {day, n}: new words asked for today beyond the daily number (Meet 5 new)
    laterRecall: s.laterRecall || {}, // wordId -> the first day it was recalled on a day after it was met (Graduated)
    dayPlan: s.dayPlan || null,    // {day, catchUp, overdue, caughtUp, softStop, stopped}: today's checkpoints (breaks)
  };
}

export function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  let s = {};
  if (raw) { try { s = JSON.parse(raw) || {}; } catch (e) { s = {}; } }
  if (typeof s !== 'object') s = {};
  return shape(s);
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}

export function exportState(state) {
  return JSON.stringify({ app: APP, version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importState(text) {
  const s = JSON.parse(text);
  if (!s || s.app !== APP) throw new Error('That file is not a Hebrew by Book progress file.');
  return shape(s);
}

// Debug links (?debug=…) work on their own storage, wiped at each load, so real progress is never touched.
export function useScratchStorage() {
  KEY = SCRATCH_KEY;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return loadState();
}

export { todayKey, dayStartAt, dayEnd, DAY_ROLLOVER_HOUR, DEFAULT_SETTINGS };
