// Music theory: scales, key handling, chord parsing.
// All notes represented as MIDI numbers (C-1 = 0, middle C = 60).

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SCALES = {
  'major':          [0, 2, 4, 5, 7, 9, 11],
  'minor':          [0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor':  [0, 2, 3, 5, 7, 9, 11],
  'dorian':         [0, 2, 3, 5, 7, 9, 10],
  'phrygian':       [0, 1, 3, 5, 7, 8, 10],
  'lydian':         [0, 2, 4, 6, 7, 9, 11],
  'mixolydian':     [0, 2, 4, 5, 7, 9, 10],
  'locrian':        [0, 1, 3, 5, 6, 8, 10],
  'minor-pent':     [0, 3, 5, 7, 10],
  'major-pent':     [0, 2, 4, 7, 9],
  'blues':          [0, 3, 5, 6, 7, 10],
};

function pitchClassFromName(name) {
  const idx = NOTE_NAMES.indexOf(name);
  if (idx >= 0) return idx;
  const flatIdx = NOTE_NAMES_FLAT.indexOf(name);
  if (flatIdx >= 0) return flatIdx;
  return -1;
}

function midiToName(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// Pad a non-heptatonic scale (pentatonic, blues) to 7 degrees by mapping each
// diatonic function onto the nearest scale tone. The generators think in
// 7-degree space (scaleStep + 7·octave); without this, degree 6 of a 6-note
// scale reads undefined and produces NaN pitches — invisible notes that get
// scheduled as NaN Hz voices, which Tone.js can never release (stuck tones).
function toHeptatonic(intervals) {
  if (intervals.length >= 7) return intervals;
  // Pick the template matching the scale's third, then snap each degree.
  const template = intervals.includes(4)
    ? [0, 2, 4, 5, 7, 9, 11]    // major-ish
    : [0, 2, 3, 5, 7, 8, 10];   // minor-ish
  return template.map(t => {
    let best = intervals[0], bestDist = Infinity;
    for (const iv of intervals) {
      const d = Math.abs(iv - t);
      if (d < bestDist) { bestDist = d; best = iv; }
    }
    return best;
  });
}

// --- Chord progression parser ---
// Supports roman numerals (i, V, ♭VII, VImaj7) and chord names (Am, F#m7, Cmaj7, G/B).
// Returns an array of { root: midi, pitchClasses: [pc...], label: string } per chord.

const ROMAN_DEGREES = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

function parseProgression(text, tonicMidi, scaleIntervals) {
  if (!text || !text.trim()) return [];
  const tokens = text.replace(/\|/g, ' ').split(/\s+/).filter(t => t && t !== '/');
  const chords = [];
  for (const t of tokens) {
    const c = parseChordToken(t, tonicMidi, scaleIntervals);
    if (c) chords.push(c);
  }
  return chords;
}

function parseChordToken(token, tonicMidi, scaleIntervals) {
  let body = token.trim();
  if (!body) return null;
  let chromaShift = 0;
  while (body.startsWith('b') || body.startsWith('♭')) { chromaShift -= 1; body = body.slice(1); }
  while (body.startsWith('#') || body.startsWith('♯')) { chromaShift += 1; body = body.slice(1); }

  // Roman numeral form
  const romanMatch = body.match(/^(VII|vii|VI|vi|IV|iv|III|iii|II|ii|V|v|I|i)(°|dim|m|maj7|M7|7|sus2|sus4)?(.*)?$/);
  if (romanMatch) {
    const numeral = romanMatch[1];
    const suffix = (romanMatch[2] || '') + (romanMatch[3] || '');
    const isLower = numeral === numeral.toLowerCase();
    const degreeIdx = ROMAN_DEGREES.indexOf(numeral.toLowerCase());
    const tonicPc = tonicMidi % 12;
    const scalePc = (tonicPc + (scaleIntervals[degreeIdx] ?? 0) + chromaShift + 12) % 12;
    const rootMidi = (Math.floor(tonicMidi / 12)) * 12 + scalePc;
    let quality = isLower ? 'm' : 'M';
    if (suffix.startsWith('°') || suffix.startsWith('dim')) quality = 'dim';
    return buildChord(rootMidi, quality, suffix, token);
  }

  // Letter-name form
  const noteMatch = body.match(/^([A-G])([#b♭♯]?)(.*)$/);
  if (noteMatch) {
    let name = noteMatch[1] + (noteMatch[2] === '♭' ? 'b' : noteMatch[2] === '♯' ? '#' : (noteMatch[2] || ''));
    let pc = pitchClassFromName(name);
    if (pc < 0) return null;
    pc = ((pc + chromaShift) + 12) % 12;
    const suffix = noteMatch[3] || '';
    let quality = 'M';
    if (suffix.startsWith('m') && !suffix.startsWith('maj')) quality = 'm';
    if (suffix.startsWith('dim') || suffix.startsWith('°')) quality = 'dim';
    if (suffix.startsWith('aug') || suffix.startsWith('+')) quality = 'aug';
    const rootMidi = (Math.floor(tonicMidi / 12)) * 12 + pc;
    return buildChord(rootMidi, quality, suffix, token);
  }

  return null;
}

function buildChord(rootMidi, quality, suffix, label) {
  let intervals;
  switch (quality) {
    case 'm':   intervals = [0, 3, 7]; break;
    case 'dim': intervals = [0, 3, 6]; break;
    case 'aug': intervals = [0, 4, 8]; break;
    default:    intervals = [0, 4, 7];
  }
  if (suffix.includes('sus2')) intervals = [0, 2, 7];
  if (suffix.includes('sus4')) intervals = [0, 5, 7];
  if (suffix.includes('maj7') || suffix.includes('M7')) intervals.push(11);
  else if (suffix.includes('7')) intervals.push(10);
  if (suffix.includes('9')) intervals.push(14);
  if (suffix.includes('add9')) intervals.push(14);

  const pitchClasses = intervals.map(i => ((rootMidi + i) % 12 + 12) % 12);
  return { root: rootMidi, intervals, pitchClasses, label };
}

