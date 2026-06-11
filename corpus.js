// Corpus of riff fragments and rhythm patterns, hand-crafted in scale-degree notation.
// Scale steps are integers where 0 = tonic, 7 = octave up, -7 = octave down.
// Rhythm patterns are 16-step arrays (one bar of 16th-notes), 1 = onset, 0 = rest, T = tie/sustain.

// Each riff fragment carries a "style" tag used as a prior when generating.
const RIFF_FRAGMENTS = [
  // ---- Genesis / dark, root-fifth pulse, modal ----
  { style: 'genesis', steps: [0, 0, 4, 0, 6, 0, 4, 0] },
  { style: 'genesis', steps: [0, -3, 0, 4, 0, -3, -5, 0] },
  { style: 'genesis', steps: [0, 0, 6, 4, 0, 0, 4, 6] },
  { style: 'genesis', steps: [0, 4, 6, 7, 6, 4, 0, -3] },
  { style: 'genesis', steps: [0, 0, 0, 6, 0, 0, 4, 6] },

  // ---- D.A.N.C.E. / syncopated funky melody ----
  { style: 'dance', steps: [4, 2, 0, 4, 2, 4, 5, 7] },
  { style: 'dance', steps: [0, 2, 4, 5, 7, 5, 4, 2] },
  { style: 'dance', steps: [4, 5, 7, 5, 4, 2, 0, 2] },
  { style: 'dance', steps: [7, 5, 4, 5, 2, 4, 0, 2] },
  { style: 'dance', steps: [2, 4, 0, 2, 4, 5, 7, 4] },

  // ---- Phantom / fast chromatic-feel descent & climb ----
  { style: 'phantom', steps: [7, 6, 5, 4, 3, 2, 1, 0] },
  { style: 'phantom', steps: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1] },
  { style: 'phantom', steps: [4, 3, 4, 2, 4, 1, 4, 0] },
  { style: 'phantom', steps: [7, 8, 9, 7, 8, 7, 6, 7] },
  { style: 'phantom', steps: [0, 2, 1, 3, 2, 4, 3, 5] },

  // ---- Anthemic / singable, scale-tone leaps to fifths ----
  { style: 'anthem', steps: [0, 2, 4, 7, 4, 2, 0, -3] },
  { style: 'anthem', steps: [2, 4, 5, 7, 5, 4, 2, 0] },
  { style: 'anthem', steps: [4, 7, 4, 2, 0, 2, 4, 5] },
  { style: 'anthem', steps: [0, 4, 7, 9, 7, 4, 2, 0] },
  { style: 'anthem', steps: [7, 4, 2, 0, 2, 4, 7, 9] },

  // ---- Minimal pulse / hypnotic ----
  { style: 'pulse', steps: [0, 0, 0, 0, 4, 0, 0, 4] },
  { style: 'pulse', steps: [0, 0, 4, 0, 0, 0, 4, 0] },
  { style: 'pulse', steps: [0, 0, 0, 7, 0, 0, 0, 4] },
  { style: 'pulse', steps: [0, 7, 0, 4, 0, 7, 0, 4] },

  // ---- Cosmic disco / Nordic-disco / Todd Terje vibe ----
  { style: 'cosmic', steps: [9, 7, 5, 4, 2, 0, -3, -5] },     // long descending line
  { style: 'cosmic', steps: [0, 2, 4, 7, 9, 7, 4, 2] },        // up-and-down arch
  { style: 'cosmic', steps: [0, 7, 0, 7, 4, 2, 0, -3] },       // octave bouncing
  { style: 'cosmic', steps: [4, 7, 9, 11, 9, 7, 4, 2] },       // upper-register sweep
  { style: 'cosmic', steps: [0, -3, 0, 4, 0, -3, 0, 7] },      // pedal-with-motion
  { style: 'cosmic', steps: [2, 4, 7, 9, 11, 9, 7, 4] },       // climbing

  // ---- Italo arp / synthwave 16ths ----
  { style: 'italo', steps: [0, 4, 7, 4, 0, 4, 7, 4] },         // triad arp
  { style: 'italo', steps: [0, 4, 7, 9, 7, 4, 0, -3] },        // arch over chord
  { style: 'italo', steps: [0, 2, 4, 7, 4, 2, 0, -3] },
  { style: 'italo', steps: [0, 4, 7, 9, 12, 9, 7, 4] },        // wider arp

  // ---- Acid bass / TB-303 vibe ----
  { style: 'acid', steps: [0, 0, 0, 0, 0, 7, 0, 0] },          // root with one accent
  { style: 'acid', steps: [0, 1, 0, 1, 0, 7, 0, 7] },          // chromatic flourish
  { style: 'acid', steps: [0, 0, 4, 0, 0, 7, 0, -2] },         // upward push
  { style: 'acid', steps: [0, -3, 0, -3, 0, 7, 0, -3] },       // squelch

  // ---- Filter house / Daft Punk loop ----
  { style: 'filter', steps: [0, 2, 4, 2, 0, 2, 4, 2] },        // 4-bar hook shape
  { style: 'filter', steps: [0, 4, 0, 4, 5, 4, 2, 0] },
  { style: 'filter', steps: [4, 2, 0, 2, 4, 5, 4, 2] },

  // ---- Topline / sing-along hook ----
  { style: 'topline', steps: [4, 4, 2, 0, 4, 4, 2, 0] },       // chant-like
  { style: 'topline', steps: [0, 4, 7, 4, 5, 4, 2, 0] },
  { style: 'topline', steps: [4, 5, 7, 5, 4, 2, 0, 2] },

  // ---- Ambient / slow gentle motion ----
  { style: 'ambient', steps: [0, 2, 4, 5, 4, 2, 0, -3] },
  { style: 'ambient', steps: [0, -3, -5, -3, 0, 4, 0, -3] },
  { style: 'ambient', steps: [4, 5, 7, 5, 4, 2, 0, 2] },

  // ---- Baroque / Bach-fugue subjects / Justice "Heavy Metal" ----
  // Characteristics: stepwise minor/phrygian, leap up + descend, sequential motion
  { style: 'baroque', steps: [0, -2, -3, -5, -3, -2, 0, 2] },   // minor declamation
  { style: 'baroque', steps: [0, 2, 3, 4, 3, 2, 0, -2] },        // up + down steps
  { style: 'baroque', steps: [0, -3, -5, -3, -1, -3, -5, -7] },  // descending
  { style: 'baroque', steps: [0, 4, 3, 2, 0, -2, -3, -5] },      // leap-then-fall
  { style: 'baroque', steps: [4, 5, 4, 2, 0, 2, 4, 3] },         // upper-voice
  { style: 'baroque', steps: [0, 2, 4, 3, 2, 4, 3, 2] },         // sequence
  { style: 'baroque', steps: [-3, -2, 0, -2, -3, -5, -3, -7] },  // leading tones

  // ---- Rock / pentatonic power-riff (root-heavy, b7 hooks) ----
  { style: 'rock', steps: [0, 0, 3, 0, 4, 0, 3, 2] },
  { style: 'rock', steps: [0, 3, 4, 6, 4, 3, 0, 0] },
  { style: 'rock', steps: [0, 0, 0, 2, 3, 3, 2, 0] },
  { style: 'rock', steps: [4, 3, 0, 0, 4, 3, 0, 2] },
  { style: 'rock', steps: [0, 2, 3, 3, 2, 0, -1, 0] },
  { style: 'rock', steps: [0, 0, 6, 0, 0, 4, 3, 0] },

  // ---- Reggae / dub bass (root-fifth-octave, laid back) ----
  { style: 'reggae', steps: [0, 0, 4, 0, 5, 4, 0, 0] },
  { style: 'reggae', steps: [0, 4, 7, 4, 0, 0, 4, 5] },
  { style: 'reggae', steps: [0, -3, 0, 4, 0, 4, 5, 7] },
  { style: 'reggae', steps: [0, 0, 0, 4, 5, 4, 2, 0] },
  { style: 'reggae', steps: [7, 5, 4, 0, 4, 5, 4, 0] },

  // ---- Latin / montuno-style arpeggiated motion ----
  { style: 'latin', steps: [0, 2, 4, 2, 0, 2, 4, 7] },
  { style: 'latin', steps: [4, 2, 0, 2, 4, 5, 4, 2] },
  { style: 'latin', steps: [0, 4, 2, 4, 0, 4, 2, 4] },
  { style: 'latin', steps: [7, 4, 2, 4, 7, 5, 4, 2] },
  { style: 'latin', steps: [0, 2, 4, 5, 7, 5, 4, 2] },
];

// Rhythm cells per beat (4 sixteenth-positions). 1 = onset, 0 = rest.
// We compose a bar from 4 cells. Style weights select which cells are more likely.
const RHYTHM_CELLS = [
  { id: 'A', pattern: [1, 0, 0, 0] },        // quarter on beat
  { id: 'B', pattern: [1, 0, 1, 0] },        // 8th + 8th
  { id: 'C', pattern: [0, 0, 1, 0] },        // off-beat 8th only
  { id: 'D', pattern: [1, 1, 1, 0] },        // three 16ths in a row
  { id: 'E', pattern: [1, 0, 1, 1] },        // 1, +, a
  { id: 'F', pattern: [1, 1, 0, 1] },        // 1, e, a
  { id: 'G', pattern: [1, 1, 1, 1] },        // four 16ths
  { id: 'H', pattern: [0, 1, 0, 1] },        // pure off-beats
  { id: 'I', pattern: [0, 0, 0, 0] },        // rest
  { id: 'J', pattern: [1, 0, 0, 1] },        // 1 + a syncopation
  { id: 'K', pattern: [0, 1, 1, 0] },        // e + duo
];

// Style weights for cell selection (per-beat). Higher = more likely.
const STYLE_RHYTHM_WEIGHTS = {
  genesis: { A: 6, B: 5, C: 2, D: 2, E: 3, F: 2, G: 1, H: 1, I: 2, J: 4, K: 2 },
  dance:   { A: 2, B: 4, C: 4, D: 3, E: 5, F: 5, G: 2, H: 5, I: 2, J: 5, K: 4 },
  phantom: { A: 1, B: 3, C: 2, D: 5, E: 5, F: 4, G: 7, H: 2, I: 1, J: 2, K: 3 },
  anthem:  { A: 5, B: 6, C: 3, D: 2, E: 3, F: 2, G: 1, H: 2, I: 2, J: 3, K: 2 },
  pulse:   { A: 8, B: 4, C: 2, D: 1, E: 1, F: 1, G: 1, H: 3, I: 5, J: 2, K: 1 },
  // Cosmic disco — quarters + 8th-pickups, flowing, balanced
  cosmic:  { A: 4, B: 5, C: 3, D: 3, E: 3, F: 3, G: 2, H: 3, I: 3, J: 4, K: 3 },
  // Italo / synthwave — 16th-arp dominant
  italo:   { A: 2, B: 4, C: 3, D: 5, E: 5, F: 4, G: 6, H: 3, I: 1, J: 3, K: 3 },
  // Acid bass — busy 16ths with off-beat accents
  acid:    { A: 2, B: 3, C: 4, D: 4, E: 5, F: 5, G: 6, H: 4, I: 1, J: 4, K: 4 },
  // Filter house — syncopated 4-bar grooves
  filter:  { A: 3, B: 4, C: 4, D: 3, E: 4, F: 4, G: 3, H: 4, I: 2, J: 5, K: 4 },
  // Topline — on-beat sing-along
  topline: { A: 5, B: 6, C: 2, D: 2, E: 2, F: 2, G: 1, H: 2, I: 3, J: 2, K: 2 },
  // Ambient — mostly rests with sparse onsets
  ambient: { A: 6, B: 2, C: 2, D: 1, E: 1, F: 1, G: 1, H: 1, I: 7, J: 1, K: 1 },
  // Baroque — steady 8th/16th drive, moderate syncopation
  baroque: { A: 4, B: 5, C: 2, D: 4, E: 4, F: 3, G: 3, H: 2, I: 1, J: 3, K: 3 },
  // Rock — 8th-note drive, straight accents
  rock:    { A: 5, B: 7, C: 2, D: 3, E: 3, F: 2, G: 2, H: 1, I: 1, J: 3, K: 1 },
  // Reggae — off-beat-led (one drop), plenty of air
  reggae:  { A: 2, B: 2, C: 7, D: 1, E: 2, F: 1, G: 1, H: 6, I: 4, J: 3, K: 2 },
  // Latin — syncopated, clave feel
  latin:   { A: 2, B: 3, C: 3, D: 3, E: 5, F: 4, G: 2, H: 3, I: 1, J: 6, K: 4 },
};

// Phrase structures: which role to use for each bar. Each structure carries a
// `rep` tag (0..1) — when the user's repetition slider matches `rep`, that
// structure is most likely to be chosen. Lower rep = more variation.
//
// Roles:
//   'A'  = motif A as-is
//   "A'" = motif A varied (random op: transpose / rotate / retrograde / sequence)
//   "A''"= motif A varied (different op than A')
//   'B'  = motif B (independent melodic idea)
//   "B'" = motif B varied
//   'F'  = fragment of current motif (first half + tail)
//   'C'  = cadence: resolve final note(s) to chord root / tonic
const PHRASE_STRUCTURES = {
  2: [
    { rep: 0.9, pat: ['A', 'A'] },
    { rep: 0.6, pat: ['A', "A'"] },
    { rep: 0.3, pat: ['A', 'B'] },
    { rep: 0.5, pat: ['A', 'C'] },
  ],
  4: [
    { rep: 0.95, pat: ['A', 'A', 'A', 'C'] },
    { rep: 0.85, pat: ['A', 'A', "A'", 'C'] },
    { rep: 0.75, pat: ['A', "A'", 'A', 'C'] },
    { rep: 0.65, pat: ['A', "A'", "A''", 'C'] },
    { rep: 0.55, pat: ['A', "A'", 'B', 'C'] },
    { rep: 0.45, pat: ['A', 'B', "A'", 'C'] },
    { rep: 0.35, pat: ['A', 'B', "B'", 'C'] },
    { rep: 0.30, pat: ['A', 'F', 'B', 'C'] },
    { rep: 0.20, pat: ['A', "A'", 'B', "B'"] },
  ],
  8: [
    { rep: 0.90, pat: ['A', 'A', "A'", 'C', 'A', 'A', "A'", 'C'] },
    { rep: 0.78, pat: ['A', "A'", 'A', 'C', 'A', "A'", "A''", 'C'] },
    { rep: 0.65, pat: ['A', "A'", 'B', 'C', 'A', "A''", "B'", 'C'] },
    { rep: 0.50, pat: ['A', "A'", 'B', "B'", 'A', "A'", "A''", 'C'] },
    { rep: 0.40, pat: ['A', 'B', "A'", 'B', 'A', "A'", "B'", 'C'] },
    { rep: 0.30, pat: ['A', "A'", 'B', "B'", "A''", 'F', 'B', 'C'] },
    { rep: 0.20, pat: ['A', 'F', 'B', "A'", "B'", 'A', "A''", 'C'] },
    { rep: 0.15, pat: ['A', 'B', "A'", "B'", 'A', 'B', "A''", 'C'] },
  ],
  16: [
    { rep: 0.85, pat: ['A','A',"A'",'C','A','A',"A'",'C','A','A',"A''",'C','A','A',"A'",'C'] },
    { rep: 0.60, pat: ['A',"A'",'B','C','A',"A''",'B','C','A',"A'",'B',"B'",'A',"A''",'B','C'] },
    { rep: 0.40, pat: ['A','B',"A'",'C','A',"A''",'B','C','A',"A'","B'",'C','A','B',"A''",'C'] },
    { rep: 0.25, pat: ['A',"A'",'B','C','B',"B'",'A','C','A',"A''",'F','B',"A''","B'",'A','C'] },
  ],
};

function mod7(n) { return ((n % 7) + 7) % 7; }

// Precomputed bigram transition tables — built once at module load.
// Shape: { [style]: { [fromDeg]: { keys: Int8Array, weights: Float32Array } } }
// Storing keys/weights as parallel typed arrays lets the hot Markov loop in
// generateBarMelody skip Object.keys() + .map() allocations on every onset.
const BIGRAMS_BY_STYLE = (() => {
  // First pass: build nested counts object.
  const counts = {};
  for (const frag of RIFF_FRAGMENTS) {
    const table = counts[frag.style] ?? (counts[frag.style] = {});
    const steps = frag.steps;
    for (let i = 0; i < steps.length - 1; i++) {
      const a = mod7(steps[i]);
      const b = mod7(steps[i + 1]);
      const row = table[a] ?? (table[a] = {});
      row[b] = (row[b] || 0) + 1;
    }
  }
  // Second pass: flatten each {from: {to: count}} row to {keys, weights}.
  const out = {};
  for (const [style, table] of Object.entries(counts)) {
    out[style] = {};
    for (const [from, row] of Object.entries(table)) {
      const keys = Object.keys(row).map(Number);
      const weights = keys.map(k => row[k]);
      out[style][from] = { keys, weights };
    }
  }
  return out;
})();

// Fallback if style has no fragments — a neutral diatonic walk.
const DEFAULT_BIGRAMS = {
  0: { keys: [2, 4, 0], weights: [2, 2, 1] },
  2: { keys: [0, 4], weights: [2, 1] },
  4: { keys: [2, 0], weights: [2, 1] },
};

function bigramsForStyle(style) {
  return BIGRAMS_BY_STYLE[style] ?? DEFAULT_BIGRAMS;
}

// ===================== DRUMS =====================
// General MIDI drum map (channel 10 / index 9). Patterns are 16-step arrays of
// onset PROBABILITY (1 = always, 0.x = sometimes — gives organic variation per
// bar). `vel` is base velocity; `accent` marks steps that get a velocity boost.

const GM = {
  KICK: 36, SNARE: 38, CLAP: 39, RIM: 37,
  CHAT: 42, OHAT: 46, RIDE: 51, CRASH: 49,
  TOM_LO: 45, TOM_MID: 47, TOM_HI: 50,
  TAMB: 54, COWBELL: 56, SHAKER: 70, CLAVE: 75,
  CONGA_OPEN: 63, CONGA_SLAP: 62,
  BONGO_HI: 60, BONGO_LO: 61,
  TIMBALE_HI: 65, TIMBALE_LO: 66,
  CABASA: 69, GUIRO_LONG: 73, GUIRO_SHORT: 74,
  WOODBLOCK_HI: 76, WOODBLOCK_LO: 77, TRIANGLE: 81,
};

const DRUM_LABELS = {
  36: 'Kick', 38: 'Snare', 39: 'Clap', 37: 'Rimshot',
  42: 'Hi-hat', 46: 'Open hat', 51: 'Ride', 49: 'Crash',
  45: 'Low tom', 47: 'Mid tom', 50: 'High tom',
  54: 'Tambourine', 56: 'Cowbell', 70: 'Shaker', 75: 'Clave',
  63: 'Open conga', 62: 'Slap conga',
  60: 'Hi bongo', 61: 'Lo bongo',
  65: 'Hi timbale', 66: 'Lo timbale',
  69: 'Cabasa', 73: 'Guiro long', 74: 'Guiro short',
  76: 'Woodblock hi', 77: 'Woodblock lo', 81: 'Triangle',
};

// Each style: { [gmPitch]: { prob: number[16], vel: number, ghost?: boolean } }
// ghost = extra hits added by density slider get very low velocity (ghost notes).
const DRUM_STYLES = {
  house: {
    [GM.KICK]:   { prob: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], vel: 110 },
    [GM.CLAP]:   { prob: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], vel: 96 },
    [GM.CHAT]:   { prob: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], vel: 72 },
    [GM.OHAT]:   { prob: [0,0,.25,0, 0,0,.25,0, 0,0,.25,0, 0,0,.5,0], vel: 80 },
    [GM.SHAKER]: { prob: [.2,.2,.2,.2, .2,.2,.2,.2, .2,.2,.2,.2, .2,.2,.2,.2], vel: 55, ghost: true },
  },
  techno: {
    [GM.KICK]:   { prob: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], vel: 115 },
    [GM.CLAP]:   { prob: [0,0,0,0, .7,0,0,0, 0,0,0,0, .7,0,0,0], vel: 88 },
    [GM.CHAT]:   { prob: [.8,.5,.8,.5, .8,.5,.8,.5, .8,.5,.8,.5, .8,.5,.8,.5], vel: 60 },
    [GM.OHAT]:   { prob: [0,0,.5,0, 0,0,.5,0, 0,0,.5,0, 0,0,.5,0], vel: 75 },
    [GM.RIM]:    { prob: [0,.15,0,.15, 0,.15,0,0, 0,.15,0,.15, 0,0,.15,0], vel: 58, ghost: true },
  },
  disco: {
    [GM.KICK]:   { prob: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], vel: 108 },
    [GM.SNARE]:  { prob: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], vel: 95 },
    [GM.OHAT]:   { prob: [0,0,.95,0, 0,0,.95,0, 0,0,.95,0, 0,0,.95,0], vel: 85 },
    [GM.CHAT]:   { prob: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], vel: 65 },
    [GM.TAMB]:   { prob: [.3,.3,.3,.3, .3,.3,.3,.3, .3,.3,.3,.3, .3,.3,.3,.3], vel: 58, ghost: true },
  },
  rock: {
    [GM.KICK]:   { prob: [1,0,0,0, 0,0,0,0, 1,0,.5,0, 0,0,0,0], vel: 112 },
    [GM.SNARE]:  { prob: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], vel: 105 },
    [GM.CHAT]:   { prob: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], vel: 70 },
    [GM.CRASH]:  { prob: [.3,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], vel: 100 },
    [GM.OHAT]:   { prob: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,.3,0], vel: 82 },
  },
  funkbreak: {
    [GM.KICK]:   { prob: [1,0,0,.3, 0,0,.5,0, 0,.3,1,0, 0,.4,0,0], vel: 108 },
    [GM.SNARE]:  { prob: [0,0,0,.35, 1,0,0,.35, 0,.35,0,0, 1,0,0,.35], vel: 102 },
    [GM.CHAT]:   { prob: [.85,.5,.85,.5, .85,.5,.85,.5, .85,.5,.85,.5, .85,.5,.85,.5], vel: 64 },
    [GM.OHAT]:   { prob: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,.35,0], vel: 80 },
  },
  latin: {
    [GM.CLAVE]:      { prob: [1,0,0,1, 0,0,1,0, 0,0,1,0, 1,0,0,0], vel: 85 },   // 3-2 son
    [GM.COWBELL]:    { prob: [.7,0,0,0, .7,0,0,0, .7,0,0,0, .7,0,0,0], vel: 75 },
    [GM.CONGA_OPEN]: { prob: [0,0,.6,0, 0,0,.7,0, 0,0,.5,0, 0,0,.85,0], vel: 88 },
    [GM.CONGA_SLAP]: { prob: [0,0,0,0, .6,0,0,0, 0,0,0,0, .6,0,0,0], vel: 80 },
    [GM.SHAKER]:     { prob: [.8,.4,.8,.4, .8,.4,.8,.4, .8,.4,.8,.4, .8,.4,.8,.4], vel: 56, ghost: true },
    [GM.KICK]:       { prob: [0,0,0,0, 0,0,.5,0, 0,0,0,0, 0,0,.8,0], vel: 100 },
  },
  // Reggae one drop: the weight lands on beat 3 (kick + rim together), air on beat 1.
  onedrop: {
    [GM.KICK]:   { prob: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], vel: 110 },
    [GM.RIM]:    { prob: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], vel: 95 },
    [GM.CHAT]:   { prob: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], vel: 66 },
    [GM.OHAT]:   { prob: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,.4,0], vel: 78 },
    [GM.SHAKER]: { prob: [.3,.3,.3,.3, .3,.3,.3,.3, .3,.3,.3,.3, .3,.3,.3,.3], vel: 50, ghost: true },
  },
  // Lo-fi boom bap: lazy kick, relaxed snare around 2/4, sparse hats.
  lofi: {
    [GM.KICK]:   { prob: [1,0,0,.25, 0,0,.4,0, .6,0,.3,0, 0,0,0,0], vel: 100 },
    [GM.SNARE]:  { prob: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,.2], vel: 88 },
    [GM.CHAT]:   { prob: [.8,0,.5,0, .8,0,.5,0, .8,0,.5,0, .8,0,.5,0], vel: 55 },
    [GM.RIM]:    { prob: [0,0,.15,0, 0,0,0,.15, 0,.15,0,0, 0,0,.15,0], vel: 48, ghost: true },
  },

  // ===== PERCUSSION LAYERS (no kick/snare — meant to stack on a drum kit) =====
  // Cumbia: guacharaca long–short–short, maracas, llamador on the offbeats,
  // open quinto hits, campana pulse, tambora accents on the low tom.
  cumbia: {
    [GM.GUIRO_LONG]:  { prob: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], vel: 82 },
    [GM.GUIRO_SHORT]: { prob: [0,0,.85,.85, 0,0,.85,.85, 0,0,.85,.85, 0,0,.85,.85], vel: 66 },
    [GM.SHAKER]:      { prob: [.9,0,.6,0, .9,0,.6,0, .9,0,.6,0, .9,0,.6,0], vel: 58, ghost: true },
    [GM.CONGA_SLAP]:  { prob: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], vel: 86 },     // llamador
    [GM.CONGA_OPEN]:  { prob: [0,0,.3,0, 0,0,.5,0, 0,0,.4,0, 0,0,.75,0], vel: 90 }, // quinto
    [GM.COWBELL]:     { prob: [.35,0,0,0, .35,0,0,0, .35,0,0,0, .35,0,0,0], vel: 72 },
    [GM.TOM_LO]:      { prob: [0,0,0,0, .3,0,0,0, 0,0,0,0, .45,0,0,0], vel: 92 },   // tambora
  },
  percHouse: {
    [GM.SHAKER]:      { prob: [.85,.4,.85,.4, .85,.4,.85,.4, .85,.4,.85,.4, .85,.4,.85,.4], vel: 58, ghost: true },
    [GM.CONGA_OPEN]:  { prob: [0,0,.6,0, 0,0,.5,0, 0,0,.6,0, 0,0,.7,0], vel: 84 },
    [GM.CONGA_SLAP]:  { prob: [0,0,0,.3, 0,0,0,0, 0,0,0,.3, 0,0,0,0], vel: 76, ghost: true },
    [GM.TAMB]:        { prob: [0,0,0,0, .6,0,0,0, 0,0,0,0, .6,0,0,0], vel: 64 },
    [GM.COWBELL]:     { prob: [0,0,.15,0, 0,0,.15,0, 0,0,.15,0, 0,0,.15,0], vel: 60, ghost: true },
  },
  percDisco: {
    [GM.TAMB]:        { prob: [.8,.45,.8,.45, .8,.45,.8,.45, .8,.45,.8,.45, .8,.45,.8,.45], vel: 62, ghost: true },
    [GM.CABASA]:      { prob: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], vel: 56 },
    [GM.CONGA_OPEN]:  { prob: [0,0,.5,0, 0,0,.4,0, 0,0,.55,0, 0,0,.65,0], vel: 82 },
    [GM.BONGO_HI]:    { prob: [0,.2,0,.2, 0,.2,0,0, 0,.2,0,.2, 0,0,.25,0], vel: 70, ghost: true },
  },
  percRock: {
    [GM.TAMB]:        { prob: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], vel: 68 },
    [GM.COWBELL]:     { prob: [.3,0,0,0, .3,0,0,0, .3,0,0,0, .3,0,0,0], vel: 74 },
    [GM.SHAKER]:      { prob: [0,.25,0,.25, 0,.25,0,.25, 0,.25,0,.25, 0,.25,0,.25], vel: 50, ghost: true },
  },
  percReggae: {
    [GM.BONGO_HI]:    { prob: [0,0,.7,0, 0,.3,0,0, 0,0,.7,0, 0,.3,.4,0], vel: 76 },
    [GM.BONGO_LO]:    { prob: [0,0,0,0, .6,0,0,0, 0,0,0,0, .6,0,0,0], vel: 80 },
    [GM.GUIRO_LONG]:  { prob: [0,0,.6,0, 0,0,.6,0, 0,0,.6,0, 0,0,.6,0], vel: 64 },
    [GM.SHAKER]:      { prob: [.5,0,.5,0, .5,0,.5,0, .5,0,.5,0, .5,0,.5,0], vel: 52, ghost: true },
    [GM.WOODBLOCK_HI]:{ prob: [0,0,0,0, 0,0,0,.2, 0,0,0,0, 0,.2,0,0], vel: 62, ghost: true },
  },
  percBaroque: {
    [GM.TAMB]:        { prob: [1,0,0,0, .7,0,0,0, 1,0,0,0, .7,0,.3,0], vel: 70 },
    [GM.TRIANGLE]:    { prob: [.5,0,0,0, 0,0,0,0, .5,0,0,0, 0,0,0,0], vel: 60 },
  },
  percJazz: {
    [GM.SHAKER]:      { prob: [.8,0,.5,.3, .8,0,.5,.3, .8,0,.5,.3, .8,0,.5,.3], vel: 54, ghost: true },
    [GM.RIM]:         { prob: [0,0,0,0, .5,0,0,.2, 0,.2,0,0, .5,0,0,0], vel: 58, ghost: true },
    [GM.CABASA]:      { prob: [0,0,.35,0, 0,0,.35,0, 0,0,.35,0, 0,0,.35,0], vel: 50, ghost: true },
  },
  percSynth: {
    [GM.WOODBLOCK_HI]:{ prob: [0,0,.6,0, 0,.4,0,0, 0,0,.6,0, 0,0,0,.4], vel: 72 },
    [GM.WOODBLOCK_LO]:{ prob: [0,0,0,0, 0,0,.5,0, 0,.3,0,0, 0,0,.5,0], vel: 68 },
    [GM.COWBELL]:     { prob: [0,0,0,.4, 0,0,0,0, 0,0,0,.4, 0,0,0,0], vel: 70, ghost: true },
    [GM.CLAVE]:       { prob: [0,.3,0,0, 0,0,0,.35, 0,.3,0,0, 0,0,.35,0], vel: 76, ghost: true },
  },
  percLofi: {
    [GM.SHAKER]:      { prob: [.7,0,.4,.2, .7,0,.4,0, .7,0,.4,.2, .7,0,.4,0], vel: 48, ghost: true },
    [GM.RIM]:         { prob: [0,0,0,0, .4,0,0,0, 0,0,.2,0, .4,0,0,0], vel: 52, ghost: true },
    [GM.CONGA_SLAP]:  { prob: [0,0,0,0, 0,0,.25,0, 0,0,0,0, 0,0,.25,0], vel: 60, ghost: true },
  },
  percMinimal: {
    [GM.WOODBLOCK_HI]:{ prob: [0,0,.5,0, 0,0,0,0, 0,0,.5,0, 0,0,0,0], vel: 64 },
    [GM.SHAKER]:      { prob: [0,0,0,0, .6,0,0,0, 0,0,0,0, .6,0,0,0], vel: 50, ghost: true },
    [GM.RIM]:         { prob: [0,0,0,0, 0,0,0,.25, 0,0,0,0, 0,.25,0,0], vel: 56, ghost: true },
  },
};

// Fill material for the last bar of each 4-bar phrase: snare/tom runs over the
// final beat(s). Each entry = [stepInBar, gmPitch, velocity].
const DRUM_FILLS = [
  [[12, GM.SNARE, 90], [13, GM.SNARE, 80], [14, GM.TOM_MID, 95], [15, GM.TOM_LO, 100]],
  [[12, GM.TOM_HI, 92], [13, GM.TOM_MID, 92], [14, GM.TOM_LO, 96], [15, GM.SNARE, 100]],
  [[13, GM.SNARE, 75], [14, GM.SNARE, 88], [15, GM.SNARE, 102]],
  [[10, GM.SNARE, 70], [11, GM.SNARE, 78], [12, GM.TOM_HI, 88], [13, GM.TOM_MID, 92], [14, GM.TOM_LO, 96], [15, GM.CRASH, 100]],
];

// Fills for percussion layers — timbale rolls, conga flurries, bongo runs,
// shaker crescendos. Used when a style has no kick (= it's a perc layer).
const PERC_FILLS = [
  [[12, GM.TIMBALE_HI, 95], [13, GM.TIMBALE_HI, 85], [14, GM.TIMBALE_LO, 95], [15, GM.TIMBALE_LO, 102]],
  [[12, GM.CONGA_OPEN, 90], [13, GM.CONGA_SLAP, 80], [14, GM.CONGA_OPEN, 95], [15, GM.CONGA_OPEN, 100]],
  [[13, GM.BONGO_HI, 85], [14, GM.BONGO_LO, 90], [15, GM.BONGO_HI, 95]],
  [[10, GM.SHAKER, 55], [11, GM.SHAKER, 64], [12, GM.SHAKER, 72], [13, GM.SHAKER, 80], [14, GM.SHAKER, 88], [15, GM.SHAKER, 96]],
];
