// Hebrew rendering: verses, words, written/read places, segments. Returns HTML strings; no DOM access,
// so it is unit-tested in test/render.test.mjs. Every interpolated string goes through esc().
import { plain } from './deck.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAQQEF = '־';

// TBESH glosses for prefixes and suffixes are bracketed placeholders ("[the]", "[to]", "[emph.?]").
// Show the bracketed word when it is one, and nothing when it is only a grammatical note (the parse says it).
export function affixGloss(gloss) {
  const g = String(gloss || '');
  if (!/^\[.*\]$/.test(g)) return g;
  const inner = g.slice(1, -1);
  return /[?.]/.test(inner) ? '' : inner;
}

// A parse label in its shortest readable form: "Qal perfect (qatal), 3fs" -> "Qal qatal 3fs",
// "noun, fp, construct" -> "fp construct", "pronominal suffix, 3ms" -> "3ms".
export function shortParse(label) {
  return String(label || '')
    .replace(/sequential perfect \(weqatal\)/, 'weqatal').replace(/perfect \(qatal\)/, 'qatal')
    .replace(/imperfect \(yiqtol\)/, 'yiqtol').replace(/participle active/, 'participle')
    .replace(/infinitive construct/, 'inf. construct').replace(/infinitive absolute/, 'inf. absolute')
    .replace(/^(noun|pronominal suffix|adjective|personal pronoun),? ?/, '').replace(/,? absolute$/, '')
    .replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

// deps: { lexemes: Map, isPointed: () => bool, stageOf: lexId => stage }
export function makeRenderer({ lexemes, isPointed, stageOf }) {
  const tokText = t => isPointed() ? t.p : t.c;
  const lemmaText = l => isPointed() ? l.he : (l.cons || plain(l.he));
  const heb = (text, cls = '') => `<span class="heb${cls ? ' ' + cls : ''}" lang="he" dir="rtl">${esc(text)}</span>`;
  const glossLine = t => { if (t.gl) return t.gl.gloss; const l = lexemes.get(t.lex); return l ? l.gloss : ''; };

  // One word of a verse. o: { highlight, blank (a token id, or a list whose first id is the one asked for),
  // tappable, glosses, stages, noJoin }
  function tokHTML(t, o, extra = '') {
    if (o.blank === t.id || (Array.isArray(o.blank) && o.blank.includes(t.id))) {
      // With several blanks, the one the card asks for is marked; the others only hide a copy of the answer.
      const asked = !Array.isArray(o.blank) || o.blank[0] === t.id;
      return `<span class="w blank${asked ? ' asked' : ''}" role="img" aria-label="${asked ? 'the missing word' : 'another word, hidden'}"><span class="wt"></span></span>${t.j && !o.noJoin ? MAQQEF : ''}`;
    }
    const cls = ['w'];
    if (o.highlight === t.id) cls.push('hl');
    if (o.stages) cls.push('st-' + stageOf(t.lex));
    if (extra) cls.push(extra);
    const gl = o.glosses ? `<small class="gl" dir="ltr" lang="en">${esc(glossLine(t))}</small>` : '';
    const inner = `<span class="wt">${esc(tokText(t))}${t.j && !o.noJoin ? MAQQEF : ''}</span>${gl}`;
    return o.tappable
      ? `<button type="button" class="${cls.join(' ')}" data-tok="${esc(t.id)}">${inner}</button>`
      : `<span class="${cls.join(' ')}">${inner}</span>`;
  }

  // Written (ketiv) and read (qere) forms, both always shown. Pointed mode leads with the read form;
  // unpointed mode leads with the written consonants. Neither is called the correct one.
  // A maqqef joining the place to the next word goes after the whole group, whichever token carries it.
  function kqHTML(k, qs, o) {
    const leadQere = isPointed();
    const lead = leadQere ? (qs.length ? qs : [k]) : (k ? [k] : qs);
    const other = leadQere ? (qs.length && k ? [k] : []) : (k ? qs : []);
    const lone = !k ? 'read, not written' : !qs.length ? 'written, not read' : null;
    const leadIsQ = lead[0] && lead[0].kq === 'q';
    const mark = leadIsQ ? 'ק' : 'כ';
    const title = lone || (leadIsQ ? 'Read (qere); the written form (ketiv) follows' : 'Written (ketiv); the read form (qere) follows');
    const inner = { ...o, noJoin: true };
    const leadHTML = lead.map(t => tokHTML(t, inner, lone ? 'lone' : '')).join(' ');
    const otherHTML = other.length ? `<span class="kq-alt"><span class="kq-tag">${leadIsQ ? 'כ' : 'ק'}</span>${other.map(t => tokHTML(t, { ...inner, glosses: false }, 'alt')).join(' ')}</span>` : '';
    const joins = [k, ...qs].some(x => x && x.j);
    return `<span class="kq${lone ? ' kq-lone' : ''}" title="${esc(title)}">${leadHTML}<sup class="kq-mark" aria-label="${esc(title)}">${mark}</sup>${otherHTML}${joins ? `<span class="mq">${MAQQEF}</span>` : ''}</span>`;
  }

  function verseHTML(v, o = {}) {
    const byId = new Map(v.t.map(t => [t.id, t]));
    const done = new Set();
    let html = '';
    let joined = false;
    for (const t of v.t) {
      if (done.has(t.id)) continue;
      let part, joins;
      if (t.kq) {
        const k = t.kq === 'k' ? t : null;
        const qs = t.kq === 'k' ? (t.pair || []).map(id => byId.get(id)).filter(Boolean) : [t];
        const group = [k, ...qs].filter(Boolean);
        group.forEach(x => done.add(x.id));
        part = kqHTML(k, qs, o);
        joins = group.some(x => x.j);
      } else {
        part = tokHTML(t, o);
        joins = !!t.j;
      }
      html += (html && !joined ? ' ' : '') + part;
      joined = joins;
    }
    return `<p class="verse heb" lang="he" dir="rtl">${html}<span class="sof">׃</span></p>`;
  }

  function segmentsHTML(t) {
    return `<ul class="segs">${t.segs.map(s => {
      const l = lexemes.get(s.x);
      const g = s.gl || (l ? (l.affix ? affixGloss(l.gloss) : l.gloss) : '');
      return `<li>${heb(isPointed() ? s.t : plain(s.t))}<span>${esc(s.g)}</span><span class="muted">${esc(g)}</span></li>`;
    }).join('')}</ul>`;
  }

  // One word in its verse: the English first ("and she went / walked"), then a one-line breakdown
  // (prefixes as English words, the main word's short parse, suffixes as person-gender-number),
  // and the full parse folded away.
  function formHTML(t) {
    const brief = t.segs.map(s => {
      const l = lexemes.get(s.x);
      const label = s.r === 'main' ? shortParse(s.g) : s.r === 'pre' ? affixGloss(l && l.gloss) || shortParse(s.g) : shortParse(s.g);
      return `<span class="bseg">${heb(isPointed() ? s.t : plain(s.t))} <span>${esc(label)}</span></span>`;
    }).join('<span class="bsep">+</span>');
    return `<div class="form"><p class="formline">${heb(tokText(t), 'mid')} <b class="en"${t.enNote ? ` title="${esc(t.enNote.why)} (${esc(t.enNote.source)})"` : ''}>${esc(t.en || '')}</b></p>
      <p class="brief">${brief}</p>
      <details class="fullparse"><summary>Full parse</summary><p class="small">${esc(t.parse)}</p>${segmentsHTML(t)}</details></div>`;
  }

  // Words easily confused with this one: same consonants elsewhere in the book, and a reviewed note.
  function lookalikeHTML(l) {
    const same = (l.alike || []).map(id => lexemes.get(id)).filter(Boolean);
    if (!same.length && !l.note) return '';
    const list = same.map(x => `${heb(lemmaText(x))} <span class="muted">${esc(x.gloss)}</span>`).join(', ');
    return `<div class="alike"><b>Don't confuse</b>${same.length ? ` <span class="small">Same letters: ${list}</span>` : ''}
      ${l.note ? `<p class="small">${esc(l.note.text)} <span class="muted">(${esc(l.note.source)})</span></p>` : ''}</div>`;
  }

  return { esc, heb, tokText, lemmaText, tokHTML, kqHTML, verseHTML, segmentsHTML, formHTML, lookalikeHTML };
}
