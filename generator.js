// Riff generator: hybrid scale-template + Markov-bigram approach.
// Produces an array of note events with scale-aware pitches and chord-tone biasing.

const STEPS_PER_BEAT = 4;   // 16th-note grid
const BEATS_PER_BAR = 4;
const STEPS_PER_BAR = STEPS_PER_BEAT * BEATS_PER_BAR;
const TICKS_PER_STEP = PPQ / STEPS_PER_BEAT; // PPQ from midi.js

// --- Seeded RNG so a given seed reproduces a riff exactly ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(items, weights, rng) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ----- Rhythm generation -----
// Build one bar of 16 onsets. density 0..1 is a real target: ~1 note/bar at 0, ~14 at 1.
// Style picks the cell-shape vocabulary; density biases which cell-sizes get picked.
// Bass-role forces an onset on step 0 so chord changes articulate on the downbeat.
function generateBarRhythm(style, density, syncopation, rng, role = 'lead') {
  const weights = STYLE_RHYTHM_WEIGHTS[style] || STYLE_RHYTHM_WEIGHTS.dance;
  const onsets = new Array(STEPS_PER_BAR).fill(0);
  const targetPerBeat = density * 4;

  // Cell-selection weights depend only on (style, density, syncopation) — constant
  // across the 4 beats of one bar, so we compute them once and reuse per beat.
  const cellWeights = new Array(RHYTHM_CELLS.length);
  for (let i = 0; i < RHYTHM_CELLS.length; i++) {
    const c = RHYTHM_CELLS[i];
    const styleW = weights[c.id] || 1;
    const onsetCount = c.pattern[0] + c.pattern[1] + c.pattern[2] + c.pattern[3];
    const densityFit = Math.exp(-Math.abs(onsetCount - targetPerBeat) * 1.4);
    let w = styleW * densityFit;
    if (c.pattern[0] === 0 && (c.pattern[1] || c.pattern[2] || c.pattern[3])) {
      w *= 1 + syncopation * 2;
    }
    cellWeights[i] = w < 0.001 ? 0.001 : w;
  }

  for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
    const cell = pickWeighted(RHYTHM_CELLS, cellWeights, rng);
    const base = beat * 4;
    onsets[base]     = cell.pattern[0];
    onsets[base + 1] = cell.pattern[1];
    onsets[base + 2] = cell.pattern[2];
    onsets[base + 3] = cell.pattern[3];
  }

  if (role === 'bass') onsets[0] = 1;
  if (!onsets.some(x => x)) onsets[rng() < 0.7 ? 0 : 8] = 1;
  return onsets;
}

// ----- Melodic generation using bigrams + chord-tone bias -----
// `role`: 'lead' (default), 'bass' or 'vocal'.
// Bass forces root on beat 1, biases stepwise motion, prefers root/fifth.
// Vocal biases stepwise motion AND applies gap-fill: after a leap, the line
// strongly prefers to reverse direction by step (classic melody-writing rule).
function generateBarMelody({ rhythm, style, scaleIntervals, tonicPc, chord, chromatic, range, rng, previousDeg = null, role = 'lead' }) {
  const bigrams = bigramsForStyle(style);
  const out = [];
  let currentMod = previousDeg != null ? mod7(previousDeg) : null;
  let currentOctaveOffset = 0;
  let lastDelta = 0;   // signed scale-step interval of the previous move (gap-fill)

  const chordDegs = chordTonesInScale(chord, scaleIntervals, tonicPc);
  const rootDeg = chordDegs[0];

  for (let s = 0; s < STEPS_PER_BAR; s++) {
    if (!rhythm[s]) continue;
    const isStrong = (s % 8 === 0); // beats 1 & 3
    const isDownbeat = (s === 0);

    let nextMod;
    if (currentMod == null) {
      // First note of phrase: root for bass, chord tone for lead.
      nextMod = role === 'bass' ? rootDeg : (chordDegs[Math.floor(rng() * chordDegs.length)]);
    } else if (role === 'bass' && isDownbeat) {
      // Bass: hard-anchor beat 1 to chord root regardless of bigram preference.
      nextMod = rootDeg;
    } else {
      // Markov bigram with strong-beat chord-tone bias. The bigram table is
      // precomputed to parallel arrays (keys/weights) so we don't have to call
      // Object.keys / .map on every onset.
      const dist = bigrams[currentMod] ?? bigrams[0] ?? { keys: [0, 2, 4], weights: [1, 1, 1] };
      const keys = dist.keys;
      const vals = dist.weights;
      const n = keys.length;
      // Build biased weights into a fresh small array (still allocated per onset,
      // but no parseInt, no spread, no chained map). For typical n ≤ 5 this is
      // fine; switching to a reusable Float64Array buffer is possible but uglier.
      // Vocal: the corpus bigrams are leap-heavy (chord-tone fragments), so a
      // pure re-weighting can never produce stepwise lines — the step candidates
      // don't exist in the table. Give vocal ALL seven degrees as candidates,
      // seeded with the bigram weight where present and a floor where not.
      let cKeys = keys, cVals = vals, n2 = n;
      if (role === 'vocal') {
        cKeys = [0, 1, 2, 3, 4, 5, 6];
        cVals = cKeys.map(d => {
          const idx = keys.indexOf(d);
          return idx >= 0 ? vals[idx] + 1 : 1;   // corpus-informed + floor
        });
        n2 = 7;
      }
      const biased = new Array(n2);
      const bassFifth = chordDegs[2];
      for (let i = 0; i < n2; i++) {
        const deg = cKeys[i];
        let w = cVals[i];
        // Chord-tone pull on strong beats — softer for vocal so stepwise
        // motion isn't constantly yanked back to triad leaps.
        const chordPull = role === 'vocal' ? 1.6 : 3;
        if (isStrong && chordDegs.includes(deg)) w *= chordPull;
        if (isDownbeat && chordDegs.includes(deg)) w *= role === 'vocal' ? 1.5 : 2.5;
        let stepDist = deg - currentMod;
        if (stepDist > 3) stepDist -= 7;
        else if (stepDist < -3) stepDist += 7;
        const abs = stepDist < 0 ? -stepDist : stepDist;
        if (role === 'bass') {
          if (abs === 0) w *= 1.6;
          else if (abs === 1) w *= 3.0;
          else if (abs === 2) w *= 1.4;
          else w *= 0.35;
          if (deg === rootDeg) w *= 1.8;
          else if (deg === bassFifth) w *= 1.3;
        } else if (role === 'vocal') {
          // Singable lines: mostly stepwise, no repeated-note machine-gunning.
          if (abs === 1) w *= 5.0;
          else if (abs === 2) w *= 1.6;
          else if (abs === 0) w *= 0.6;
          else w *= 0.15;
          // Gap-fill: after a leap (≥3 steps), reward reversing by step.
          if (Math.abs(lastDelta) >= 3) {
            const reverses = (lastDelta > 0 && stepDist < 0) || (lastDelta < 0 && stepDist > 0);
            if (reverses && abs <= 2) w *= 4.0;
            else if (!reverses && abs >= 3) w *= 0.1; // two leaps same way: nearly never
          }
        }
        biased[i] = w;
      }
      nextMod = pickWeighted(cKeys, biased, rng);
    }

    // Determine octave drift based on contour & range slider.
    const stepDelta = currentMod == null ? 0 : signedDelta(currentMod, nextMod);
    if (Math.abs(stepDelta) >= 4 && rng() < range * 0.4) {
      currentOctaveOffset += stepDelta > 0 ? 1 : -1;
    }
    // Bass: octave-drop on beat 3 — classic Justice / French Touch move.
    if (role === 'bass' && s === 8 && nextMod === rootDeg && rng() < 0.45) {
      currentOctaveOffset -= 1;
    }
    // Keep within sensible bounds (tighter for bass).
    const octMax = role === 'bass' ? 1 : 2;
    const octMin = role === 'bass' ? -1 : -1;
    currentOctaveOffset = Math.max(octMin, Math.min(octMax, currentOctaveOffset));

    let scaleStep = nextMod + 7 * currentOctaveOffset;

    let chromaticOffset = 0;
    if (chromatic > 0 && currentMod != null && rng() < chromatic) {
      chromaticOffset = stepDelta > 0 ? -1 : 1;
    }

    out.push({ step: s, scaleStep, chromaticOffset });
    lastDelta = stepDelta;
    currentMod = nextMod;
  }
  return out;
}

// Get scale-degree indices (0..6) for the chord-tones present in the chord, in current key.
function chordTonesInScale(chord, scaleIntervals, tonicPc) {
  if (!chord) {
    // default to tonic triad
    return [0, 2, 4];
  }
  const scalePCs = scaleIntervals.map(i => (tonicPc + i + 12) % 12);
  const degs = [];
  for (const pc of chord.pitchClasses) {
    const idx = scalePCs.indexOf(pc);
    if (idx >= 0) degs.push(idx);
  }
  // fallback to tonic triad if nothing matched
  return degs.length ? degs : [0, 2, 4];
}

// Signed shortest distance from a to b on 7-step circle.
function signedDelta(a, b) {
  let d = b - a;
  if (d > 3) d -= 7;
  if (d < -3) d += 7;
  return d;
}

// ----- Variation operators on a motif -----
// Each returns a new motif (array of {step, scaleStep, chromaticOffset}).

function transposeMotif(motif, scaleStepDelta) {
  return motif.map(n => ({ ...n, scaleStep: n.scaleStep + scaleStepDelta }));
}

function rotateMotifRhythm(motif, shiftSteps) {
  return motif
    .map(n => ({ ...n, step: (n.step + shiftSteps + STEPS_PER_BAR) % STEPS_PER_BAR }))
    .sort((a, b) => a.step - b.step);
}

function retrogradeMotif(motif) {
  // Reverse the order of pitches while keeping rhythm positions.
  if (motif.length === 0) return motif;
  const sorted = [...motif].sort((a, b) => a.step - b.step);
  const reversedPitches = sorted.map(n => n.scaleStep).reverse();
  return sorted.map((n, i) => ({ ...n, scaleStep: reversedPitches[i] }));
}

function sequenceMotif(motif, stepDelta) {
  // Take first half, then repeat it transposed for second half.
  if (motif.length === 0) return motif;
  let half = motif.filter(n => n.step < STEPS_PER_BAR / 2);
  // If all original onsets were in the back half, shift them forward so the
  // first half isn't silent (which would make the variation produce no notes).
  if (half.length === 0) {
    half = motif.map(n => ({ ...n, step: n.step - STEPS_PER_BAR / 2 }))
                .filter(n => n.step >= 0);
  }
  const second = half.map(n => ({
    step: n.step + STEPS_PER_BAR / 2,
    scaleStep: n.scaleStep + stepDelta,
    chromaticOffset: n.chromaticOffset,
  }));
  return [...half, ...second];
}

function fragmentMotif(motif) {
  // Use only the first half of the motif (tail = silence).
  let half = motif.filter(n => n.step < STEPS_PER_BAR / 2);
  // Fallback: if first half is empty, fold second-half notes down.
  if (half.length === 0) {
    half = motif.map(n => ({ ...n, step: n.step - STEPS_PER_BAR / 2 }))
                .filter(n => n.step >= 0 && n.step < STEPS_PER_BAR / 2);
  }
  return half;
}

// Pick a random variation operator and apply it. `avoidOp` excludes the previous
// op so successive variations don't collapse to identical shapes. For bass-role
// the operator pool is narrower — big transpositions sound un-basslike.
function varyMotif(motif, rng, avoidOp = null, role = 'lead') {
  // Bass: skip rotate-ops (they break the beat-1 onset that anchors the harmony)
  // and big transpositions / retrograde (un-basslike).
  const ops = role === 'bass'
    ? ['transpose+2', 'transpose-2', 'sequence+2', 'sequence-2', 'fragment']
    : ['transpose+2', 'transpose-2', 'transpose+4', 'rotate2', 'rotate-2', 'retrograde', 'sequence+2', 'sequence-2', 'fragment'];
  const choices = ops.filter(o => o !== avoidOp);
  const op = choices[Math.floor(rng() * choices.length)];
  let out;
  switch (op) {
    case 'transpose+2':  out = transposeMotif(motif, 2); break;
    case 'transpose-2':  out = transposeMotif(motif, -2); break;
    case 'transpose+4':  out = transposeMotif(motif, 4); break;
    case 'rotate2':      out = rotateMotifRhythm(motif, 2); break;
    case 'rotate-2':     out = rotateMotifRhythm(motif, -2); break;
    case 'retrograde':   out = retrogradeMotif(motif); break;
    case 'sequence+2':   out = sequenceMotif(motif, 2); break;
    case 'sequence-2':   out = sequenceMotif(motif, -2); break;
    case 'fragment':     out = fragmentMotif(motif); break;
    default:             out = motif.map(n => ({ ...n }));
  }
  return { motif: out, op };
}

function cadenceMotif(motif, chord, scaleIntervals, tonicPc, rng) {
  // Replace final note with a chord-tone resolution (root preferred)
  if (motif.length === 0) return motif;
  const out = motif.map(n => ({ ...n }));
  const last = out[out.length - 1];
  const chordDegs = chordTonesInScale(chord, scaleIntervals, tonicPc);
  // Lean on root (chord's lowest-listed degree)
  const preferred = chordDegs[0];
  last.scaleStep = preferred + 7 * Math.floor(last.scaleStep / 7);
  last.chromaticOffset = 0;
  return out;
}

// ----- Top-level: build the whole phrase -----
function generateRiff({
  tonicMidi,
  scaleIntervals,
  bars = 4,
  bpm = 124,
  style = 'genesis',
  role = 'lead',
  voicing = 'compact',          // chord spacing — only used when role === 'chord'
  extensions = 'none',          // chord type (m7/maj7/9/sus etc.) — only for chord-role
  chordProgression = [],
  sliders = {},
  seed = null,
  baseRegister = 48,
}) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 0xFFFFFFFF));
  const density = clamp(sliders.density ?? 0.55, 0, 1);
  const syncopation = clamp(sliders.syncopation ?? 0.4, 0, 1);
  const range = clamp(sliders.range ?? 0.5, 0, 1);
  const chromatic = clamp(sliders.chromatic ?? 0.1, 0, 1);
  // User-facing "variation" 0..1 is inverse of internal repetition.
  const variation = clamp(sliders.variation ?? 0.35, 0, 1);
  const repetition = 1 - variation;
  const lengthFactor = clamp(sliders.length ?? 0.5, 0, 1);
  const registerSlider = clamp(sliders.register ?? 0.4, 0, 1);

  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const ticksPerBar = STEPS_PER_BAR * TICKS_PER_STEP;

  // Map register slider to a base MIDI center:
  // 0 = MIDI 36 (deep bass), 1 = MIDI 72 (lead).
  const register = Math.round(36 + registerSlider * 36);
  const adjustedBase = register;

  // Pick a phrase structure for this bar count. Match repetition slider to
  // each structure's `rep` tag — closer match = higher weight.
  const structurePool = PHRASE_STRUCTURES[bars] || PHRASE_STRUCTURES[4];
  const structureWeights = structurePool.map(s =>
    Math.exp(-Math.pow((repetition - s.rep) * 2.5, 2))
  );
  const chosen = pickWeighted(structurePool, structureWeights, rng);
  const structure = [...chosen.pat];
  if (bars > 1) structure[bars - 1] = 'C';

  // Build chord-per-bar map: if progression provided, distribute. Otherwise no chord.
  const chordPerBar = [];
  for (let b = 0; b < bars; b++) {
    if (chordProgression.length === 0) {
      chordPerBar.push(null);
    } else if (chordProgression.length >= bars) {
      chordPerBar.push(chordProgression[b]);
    } else {
      // stretch: e.g., 4 chords over 8 bars -> each chord 2 bars
      const idx = Math.floor((b / bars) * chordProgression.length);
      chordPerBar.push(chordProgression[idx]);
    }
  }

  // Generate motif A (the primary melodic idea).
  const rhythmA = generateBarRhythm(style, density, syncopation, rng, role);
  const motifA = generateBarMelody({
    rhythm: rhythmA, style, scaleIntervals, tonicPc,
    chord: chordPerBar[0], chromatic, range, rng, role,
  });

  // Generate motif B (independent idea — different rhythm, different starting pitch).
  const rhythmB = generateBarRhythm(style, density, syncopation, rng, role);
  const motifB = generateBarMelody({
    rhythm: rhythmB, style, scaleIntervals, tonicPc,
    chord: chordPerBar[Math.min(2, bars - 1)] ?? chordPerBar[0],
    chromatic, range, rng, role,
    previousDeg: role === 'bass' ? 4 : 3, // contrast B with A's starting region
  });

  const notes = [];
  let lastVarOp = null;          // remember last variation so successive A' / A'' differ
  let currentMotif = motifA;     // for 'C' and 'F': what to base cadence/fragment on

  for (let b = 0; b < bars; b++) {
    const barRole = structure[b];          // 'A', "A'", 'B', etc.
    const chord = chordPerBar[b];

    let bar;
    if (barRole === 'A') {
      bar = motifA.map(n => ({ ...n }));
      currentMotif = motifA;
    } else if (barRole === "A'") {
      const { motif: m, op } = varyMotif(motifA, rng, lastVarOp, role);
      bar = m;
      lastVarOp = op;
      currentMotif = bar;
    } else if (barRole === "A''") {
      const { motif: m, op } = varyMotif(motifA, rng, lastVarOp, role);
      bar = m;
      lastVarOp = op;
      currentMotif = bar;
    } else if (barRole === 'B') {
      bar = motifB.map(n => ({ ...n }));
      currentMotif = motifB;
    } else if (barRole === "B'") {
      const { motif: m, op } = varyMotif(motifB, rng, lastVarOp, role);
      bar = m;
      lastVarOp = op;
      currentMotif = bar;
    } else if (barRole === 'F') {
      bar = fragmentMotif(currentMotif);
    } else if (barRole === 'C') {
      bar = cadenceMotif(currentMotif, chord, scaleIntervals, tonicPc, rng);
    } else {
      bar = motifA.map(n => ({ ...n }));
    }

    // Safety net: if a variation produced an empty bar, fall back to motifA
    // so the user never sees a silent bar / empty piano roll.
    if (bar.length === 0) {
      bar = motifA.length ? motifA.map(n => ({ ...n })) : [{ step: 0, scaleStep: 0, chromaticOffset: 0 }];
    }

    // Strong-beat anchoring: beat 1 = chord ROOT (always — anchors the harmony),
    // beat 3 = nearest chord tone. For bass-role this is non-negotiable; for
    // lead it pulls the melody onto chord changes so progressions sound clear.
    if (chord) {
      const chordDegs = chordTonesInScale(chord, scaleIntervals, tonicPc);
      const rootDeg = chordDegs[0];
      for (const n of bar) {
        if (n.step === 0) {
          // Always force beat 1 to chord root.
          const octBase = Math.floor(n.scaleStep / 7) * 7;
          n.scaleStep = octBase + rootDeg;
          n.chromaticOffset = 0;
        } else if (n.step === 8) {
          // Beat 3: nearest chord tone (third/fifth are great here).
          const currentMod = mod7(n.scaleStep);
          if (!chordDegs.includes(currentMod)) {
            let best = currentMod, bestDist = 7;
            for (const cd of chordDegs) {
              const d = Math.abs(signedDelta(currentMod, cd));
              if (d < bestDist) { bestDist = d; best = cd; }
            }
            const octBase = n.scaleStep - currentMod;
            n.scaleStep = octBase + best;
          }
        }
      }
    } else if (role === 'bass') {
      // No chord progression set: anchor every bar's beat-1 to the tonic so the
      // bass pulses on the key root instead of drifting.
      const firstNote = bar.find(n => n.step === 0);
      if (firstNote) {
        const octBase = Math.floor(firstNote.scaleStep / 7) * 7;
        firstNote.scaleStep = octBase;
        firstNote.chromaticOffset = 0;
      }
    }

    // Convert scale steps to MIDI and emit notes
    for (let i = 0; i < bar.length; i++) {
      const n = bar[i];
      const nextStep = i + 1 < bar.length ? bar[i + 1].step : STEPS_PER_BAR;
      const stepsToNext = nextStep - n.step;

      // Determine duration: max sustain via lengthFactor (0 = stab, 1 = legato).
      // Capped just under 100% of the gap so repeated notes never overlap.
      const durationSteps = Math.max(1, Math.round(stepsToNext * (0.33 + lengthFactor * 0.65)));

      const pitch = scaleStepToMidi(n.scaleStep, tonicPc, scaleIntervals, adjustedBase) + (n.chromaticOffset || 0);
      const velocity = velocityForStep(n.step, style, rng);

      // Cap durations at one bar so a stuck synth voice can never ring longer
      // than ~2 seconds at typical BPM — a hard safety net for playback.
      const maxDuration = STEPS_PER_BAR * TICKS_PER_STEP;
      const rawDuration = Math.max(TICKS_PER_STEP * 0.5, durationSteps * TICKS_PER_STEP - 5);
      notes.push({
        pitch: clamp(pitch, 0, 127),
        startTicks: (b * STEPS_PER_BAR + n.step) * TICKS_PER_STEP,
        durationTicks: Math.min(maxDuration, rawDuration),
        velocity,
        scaleStep: n.scaleStep,
        chromaticOffset: n.chromaticOffset || 0,
      });
    }
  }

  // Chord-role: expand each melodic note into a voiced chord stab. The Markov
  // top-note becomes the highest voice in the voicing; underneath we stack
  // chord-tones from the current bar's harmony.
  let finalNotes = notes;
  if (role === 'chord') {
    finalNotes = expandToChordStabs(notes, chordPerBar, voicing, extensions, scaleIntervals, tonicPc, adjustedBase, ticksPerBar);
  }

  return {
    notes: finalNotes,
    totalBars: bars,
    ticksPerBar,
    basePitch: adjustedBase,
    tonicPc,
    scaleIntervals,
  };
}

// ----- Chord voicing & extensions -----
// Apply chord extensions (7ths, 9ths, sus, 13ths) on top of the basic triad.
// `profile` is a key from EXTENSION_PROFILES; `isMinor` decides between m7/maj7
// when adding a 7th. Returns a sorted, deduplicated semitone-interval array.
function applyExtensions(intervals, profile, isMinor) {
  if (!profile || profile === 'none') return intervals;
  const set = new Set(intervals);

  switch (profile) {
    case 'seven':                                   // m7 or maj7 (diatonic)
      set.add(isMinor ? 10 : 11);
      break;
    case 'dom7':                                    // always b7 (bluesy)
      set.add(10);
      break;
    case 'ninth':                                   // m9 / maj9
      set.add(isMinor ? 10 : 11);
      set.add(14);
      break;
    case 'add9':                                    // triad + 9, no 7th
      set.add(14);
      break;
    case 'six':                                     // triad + 6, no 7th
      set.add(9);
      break;
    case 'sus2':                                    // replace 3rd with 2nd
      set.delete(3); set.delete(4); set.add(2);
      break;
    case 'sus4':                                    // replace 3rd with 4th
      set.delete(3); set.delete(4); set.add(5);
      break;
    case 'thirteenth':                              // full m13 / maj13
      set.add(isMinor ? 10 : 11);
      set.add(14);
      set.add(21);
      break;
  }
  return [...set].sort((a, b) => a - b);
}

// Given a parsed chord (or null = tonic triad from scale), build the set of
// pitches for the requested voicing style + extension, anchored around basePitch.
function chordVoicingPitches(chord, voicing, extensions, scaleIntervals, tonicPc, basePitch) {
  let intervals, rootPc;
  if (chord) {
    intervals = chord.intervals.slice();
    rootPc = chord.root % 12;
  } else {
    const third = scaleIntervals[2] ?? 3;
    const fifth = scaleIntervals[4] ?? 7;
    intervals = [0, third, fifth];
    rootPc = tonicPc;
  }

  // Detect minor-ness from the 3rd in the chord (handles user-typed quality
  // AND the scale-built fallback). Used by applyExtensions to pick m7 vs maj7.
  const isMinor = intervals.includes(3) && !intervals.includes(4);
  intervals = applyExtensions(intervals, extensions, isMinor);

  // Voicing transformations (spacing / register).
  switch (voicing) {
    case 'spread':
      intervals = [...intervals, 12];               // +oct of root on top
      break;
    case 'shell':
      intervals = [0, intervals[intervals.length - 1] ?? 7];
      break;
    case 'wide':
      intervals = [0, ...intervals.slice(1).map(i => i + 12)];
      break;
    case 'octave':
      intervals = [0, 12];
      break;
    case 'compact':
    default:
      break;
  }

  const baseOctave = Math.round((basePitch - rootPc) / 12);
  const rootMidi = rootPc + 12 * baseOctave;
  return intervals.map(iv => rootMidi + iv);
}

function expandToChordStabs(notes, chordPerBar, voicing, extensions, scaleIntervals, tonicPc, basePitch, ticksPerBar) {
  // The voicing is constant within a bar (chord doesn't change mid-bar in our
  // model), so precompute the clamped + deduplicated pitch list once per bar.
  // For a 16-bar chord-riff with ~150 onsets this avoids 140+ redundant builds,
  // plus the per-onset Set allocation that was used for duplicate guarding.
  const voicingByBar = chordPerBar.map(c => {
    const raw = chordVoicingPitches(c ?? null, voicing, extensions, scaleIntervals, tonicPc, basePitch);
    const seen = new Set();
    const out = [];
    for (const p of raw) {
      const pitch = p < 0 ? 0 : p > 127 ? 127 : p;
      if (!seen.has(pitch)) { seen.add(pitch); out.push(pitch); }
    }
    return out;
  });

  const out = [];
  for (const n of notes) {
    const barIdx = Math.floor(n.startTicks / ticksPerBar);
    const voicingPitches = voicingByBar[barIdx] ?? voicingByBar[0];
    const topPitch = n.pitch;
    const harmVel = Math.max(40, n.velocity - 10);
    out.push(n);
    for (let i = 0; i < voicingPitches.length; i++) {
      const pitch = voicingPitches[i];
      if (pitch === topPitch) continue;
      out.push({
        pitch,
        startTicks: n.startTicks,
        durationTicks: n.durationTicks,
        velocity: harmVel,
        scaleStep: n.scaleStep,
        chromaticOffset: 0,
      });
    }
  }
  return out;
}

// ----- Drum generation -----
// Probability-pattern based: each instrument rolls its 16-step pattern per bar.
// density scales optional hits (prob < 0.95), syncopation adds extra off-grid
// hits, variation controls per-bar mutation + fill frequency. Returns notes
// with channel 9 (GM drums).
function generateDrums({ drumStyle, bars = 4, sliders = {}, seed = null }) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 0xFFFFFFFF));
  const style = DRUM_STYLES[drumStyle] || DRUM_STYLES.house;
  const density = clamp(sliders.density ?? 0.5, 0, 1);
  const syncopation = clamp(sliders.syncopation ?? 0.3, 0, 1);
  const variation = clamp(sliders.variation ?? 0.3, 0, 1);

  const ticksPerBar = STEPS_PER_BAR * TICKS_PER_STEP;
  const notes = [];

  for (let b = 0; b < bars; b++) {
    // Is this a fill bar? Last bar of each 4-bar group (and the final bar).
    const isFillBar = (b % 4 === 3) || (b === bars - 1 && bars > 1);
    const doFill = isFillBar && rng() < 0.25 + variation * 0.65;
    // Fill occupies the tail steps — suppress other instruments there.
    const fill = doFill ? DRUM_FILLS[Math.floor(rng() * DRUM_FILLS.length)] : null;
    const fillStart = fill ? fill[0][0] : 16;

    for (const [pitchStr, inst] of Object.entries(style)) {
      const pitch = +pitchStr;
      for (let s = 0; s < STEPS_PER_BAR; s++) {
        if (s >= fillStart && pitch !== GM.KICK) continue; // fill owns the tail
        let p = inst.prob[s];
        if (p <= 0) {
          // Syncopation: chance of an extra ghost hit on off-16ths.
          if (syncopation > 0 && (s % 2 === 1) && rng() < syncopation * 0.06) {
            p = 1;
          } else continue;
        } else if (p < 0.95) {
          // Optional hit — density scales how often it fires.
          p = p * (0.35 + density * 1.3);
        }
        if (rng() >= p) continue;

        const accent = s % 4 === 0 ? 8 : 0;
        const ghost = inst.ghost && rng() < 0.5;
        const vel = Math.max(30, Math.min(125, Math.round(
          (ghost ? inst.vel * 0.55 : inst.vel) + accent + (rng() - 0.5) * 12
        )));
        notes.push({
          pitch,
          startTicks: b * ticksPerBar + s * TICKS_PER_STEP,
          durationTicks: pitch === GM.OHAT ? TICKS_PER_STEP * 2 : Math.round(TICKS_PER_STEP * 0.9),
          velocity: vel,
          channel: 9,
        });
      }
    }

    if (fill) {
      for (const [s, pitch, vel] of fill) {
        notes.push({
          pitch,
          startTicks: b * ticksPerBar + s * TICKS_PER_STEP,
          durationTicks: Math.round(TICKS_PER_STEP * 0.9),
          velocity: Math.min(125, vel + Math.round((rng() - 0.5) * 10)),
          channel: 9,
        });
      }
      // Crash on the downbeat after a fill (if not the last bar).
      if (b + 1 < bars && rng() < 0.6) {
        notes.push({
          pitch: GM.CRASH,
          startTicks: (b + 1) * ticksPerBar,
          durationTicks: TICKS_PER_STEP * 4,
          velocity: 98,
          channel: 9,
        });
      }
    }
  }

  notes.sort((a, b2) => a.startTicks - b2.startTicks);
  return { notes, totalBars: bars, ticksPerBar, isDrums: true };
}

// ----- Shared helpers for the deterministic engines -----

function chordsPerBarList(chordProgression, bars) {
  const out = [];
  for (let b = 0; b < bars; b++) {
    if (!chordProgression || chordProgression.length === 0) out.push(null);
    else if (chordProgression.length >= bars) out.push(chordProgression[b]);
    else out.push(chordProgression[Math.floor((b / bars) * chordProgression.length)]);
  }
  return out;
}

// Nearest scale-step for an arbitrary MIDI pitch — lets harmony voices stay
// diatonic even for engine-generated notes (approach tones snap to neighbors).
function midiToNearestScaleStep(midi, tonicPc, scaleIntervals, basePitch) {
  let best = 0, bestDist = Infinity;
  for (let ss = -21; ss <= 28; ss++) {
    const d = Math.abs(scaleStepToMidi(ss, tonicPc, scaleIntervals, basePitch) - midi);
    if (d < bestDist) { bestDist = d; best = ss; }
  }
  return best;
}

// ----- ARPEGGIATOR -----
// Deterministic chord-tone patterns — the right model for arps (Markov is not).
// pattern: 'up' | 'down' | 'updown' | 'octave' | 'alberti'
//
// Musical fine-tune hooks:
//   variation   → fifth substitutions (root–oct–root–FIFTH), octave sparkle,
//                 rest injection, direction flips, and a stepwise turnaround
//                 walking into each new 4-bar phrase
//   chromatic   → semitone approach into the next bar's root + passing chromatics
//   syncopation → below 0.6: pushes a beat head a 16th late; above: off-beats only
function generateArp({ tonicMidi, scaleIntervals, bars = 4, pattern = 'up', chordProgression = [], sliders = {}, seed = null }) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 0xFFFFFFFF));
  const density = clamp(sliders.density ?? 0.6, 0, 1);
  const syncopation = clamp(sliders.syncopation ?? 0.2, 0, 1);
  const variation = clamp(sliders.variation ?? 0.2, 0, 1);
  const lengthFactor = clamp(sliders.length ?? 0.3, 0, 1);
  const registerSlider = clamp(sliders.register ?? 0.5, 0, 1);
  const range = clamp(sliders.range ?? 0.5, 0, 1);
  const chromatic = clamp(sliders.chromatic ?? 0, 0, 1);

  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const basePitch = Math.round(36 + registerSlider * 36);
  const ticksPerBar = STEPS_PER_BAR * TICKS_PER_STEP;
  const chordPerBar = chordsPerBarList(chordProgression, bars);

  const stepsPerNote = density < 0.45 ? 2 : 1;
  const offbeatOnly = syncopation > 0.6;
  const octaves = range >= 0.5 ? 2 : 1;

  const rootDegOf = b =>
    chordTonesInScale(chordPerBar[((b % bars) + bars) % bars], scaleIntervals, tonicPc)[0];

  const notes = [];
  let dirFlip = false;

  for (let b = 0; b < bars; b++) {
    const chord = chordPerBar[b];
    const chordDegs = chordTonesInScale(chord, scaleIntervals, tonicPc);
    const pool = [];
    for (let oct = 0; oct < octaves; oct++) for (const deg of chordDegs) pool.push(deg + 7 * oct);
    pool.sort((a, b2) => a - b2);

    let seq;
    switch (pattern) {
      case 'down':    seq = [...pool].reverse(); break;
      case 'updown':  seq = [...pool, ...pool.slice(1, -1).reverse()]; break;
      case 'octave':  seq = [chordDegs[0], chordDegs[0] + 7]; break;
      case 'alberti': seq = [pool[0], pool[2] ?? pool[0] + 7, pool[1] ?? pool[0], pool[2] ?? pool[0] + 7]; break;
      default:        seq = [...pool];
    }
    if (b > 0 && b % 4 === 0 && rng() < variation) dirFlip = !dirFlip;
    const barSeq = dirFlip ? [...seq].reverse() : seq;

    // Build the bar as editable events, then apply musical devices.
    const events = [];
    let seqIdx = 0;
    for (let s = 0; s < STEPS_PER_BAR; s += stepsPerNote) {
      if (offbeatOnly && s % 4 === 0) continue;
      events.push({ step: s, scaleStep: barSeq[seqIdx % barSeq.length], chromaOff: 0 });
      seqIdx++;
    }

    // — VARIATION devices —
    // Fifth substitution: the classic disco move (root–oct–root–FIFTH).
    if (variation > 0.15) {
      for (const ev of events) {
        if (mod7(ev.scaleStep) === mod7(chordDegs[0]) && ev.step % 8 === 4 && rng() < variation * 0.5) {
          ev.scaleStep = chordDegs[2] ?? chordDegs[0] + 4;
        }
      }
    }
    // Octave sparkle (not for the octave pattern — it already bounces).
    if (pattern !== 'octave') {
      for (const ev of events) if (rng() < variation * 0.10) ev.scaleStep += 7;
    }
    // Breathing room: drop one off-beat note per bar at higher variation.
    if (variation > 0.5 && events.length > 4 && rng() < variation * 0.5) {
      const candidates = events.filter(e => e.step % 4 !== 0);
      if (candidates.length) {
        events.splice(events.indexOf(candidates[Math.floor(rng() * candidates.length)]), 1);
      }
    }
    // Turnaround: walk stepwise into the next 4-bar phrase.
    const isPhraseEnd = (b % 4 === 3) || b === bars - 1;
    let didWalkup = false;
    if (isPhraseEnd && variation >= 0.3 && events.length >= 3 && rng() < 0.35 + variation * 0.5) {
      const target = rootDegOf(b + 1);
      const tail = events.slice(-3);
      tail[0].scaleStep = target - 3;
      tail[1].scaleStep = target - 2;
      tail[2].scaleStep = target - 1;
      for (const e of tail) e.chromaOff = 0;
      didWalkup = true;
    }

    // — CHROMATIC devices —
    if (chromatic > 0 && events.length) {
      const last = events[events.length - 1];
      if (!didWalkup && rng() < chromatic * 0.8) {
        // Semitone-below approach into the next bar's root.
        last.scaleStep = rootDegOf(b + 1);
        last.chromaOff = -1;
      }
      // Passing chromatics mid-bar at heavier settings.
      if (chromatic > 0.4) {
        for (let i = 1; i < events.length - 1; i++) {
          if (rng() < (chromatic - 0.4) * 0.3) events[i].chromaOff = rng() < 0.5 ? -1 : 1;
        }
      }
    }

    // — SYNCOPATION push (below the off-beat-only threshold) —
    if (!offbeatOnly && syncopation > 0.1 && rng() < syncopation * 0.6) {
      const heads = events.filter(e => e.step % 4 === 0 && e.step > 0);
      if (heads.length) {
        const pick = heads[Math.floor(rng() * heads.length)];
        if (!events.some(e => e.step === pick.step + 1)) pick.step += 1;
      }
    }

    for (const ev of events) {
      const pitch = clamp(scaleStepToMidi(ev.scaleStep, tonicPc, scaleIntervals, basePitch) + ev.chromaOff, 0, 127);
      const beatHead = ev.step % 4 === 0;
      notes.push({
        pitch,
        startTicks: b * ticksPerBar + ev.step * TICKS_PER_STEP,
        durationTicks: Math.max(40, Math.round(stepsPerNote * TICKS_PER_STEP * (0.3 + lengthFactor * 0.65))),
        velocity: Math.round((beatHead ? 96 : 80) + (rng() - 0.5) * 8),
        scaleStep: ev.scaleStep,
      });
    }
  }
  notes.sort((a, b2) => a.startTicks - b2.startTicks);
  return { notes, totalBars: bars, ticksPerBar, basePitch, tonicPc, scaleIntervals };
}

// ----- WALKING BASS (jazz) -----
// Quarter notes: chord root on 1, chord/scale tones walking toward the next
// bar's root, approach tone on beat 4. Swing it in your DAW.
//
// Fine-tune hooks: chromatic = how often approaches are chromatic vs diatonic,
// length = pizzicato ↔ legato gate, register = upright depth, range = octave
// jumps on beat 2, syncopation/density = the "and-of-4" skip note.
function generateWalkingBass({ tonicMidi, scaleIntervals, bars = 4, chordProgression = [], sliders = {}, seed = null }) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 0xFFFFFFFF));
  const density = clamp(sliders.density ?? 0.4, 0, 1);
  const variation = clamp(sliders.variation ?? 0.3, 0, 1);
  const syncopation = clamp(sliders.syncopation ?? 0.3, 0, 1);
  const lengthFactor = clamp(sliders.length ?? 0.5, 0, 1);
  const registerSlider = clamp(sliders.register ?? 0.2, 0, 1);
  const range = clamp(sliders.range ?? 0.3, 0, 1);
  const chromatic = clamp(sliders.chromatic ?? 0.7, 0, 1);

  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const basePitch = Math.round(32 + registerSlider * 16);   // 32..48: upright territory
  const ticksPerBar = STEPS_PER_BAR * TICKS_PER_STEP;
  const quarter = 4 * TICKS_PER_STEP;
  const chordPerBar = chordsPerBarList(chordProgression, bars);
  const gate = quarter * (0.5 + lengthFactor * 0.45);

  const rootMidiOf = (chord) => {
    const degs = chordTonesInScale(chord, scaleIntervals, tonicPc);
    return scaleStepToMidi(degs[0], tonicPc, scaleIntervals, basePitch);
  };

  const notes = [];
  for (let b = 0; b < bars; b++) {
    const chord = chordPerBar[b];
    const nextChord = chordPerBar[(b + 1) % bars];
    const degs = chordTonesInScale(chord, scaleIntervals, tonicPc);
    const r0 = rootMidiOf(chord);
    const r1 = rootMidiOf(nextChord);

    // Beat 4: approach into the next root — chromatic (semitone) or diatonic
    // (scale step) depending on the Chromatics control.
    let beat4;
    if (rng() < 0.2 + chromatic * 0.75) {
      beat4 = r1 + (rng() < 0.6 ? -1 : 1);                          // chromatic approach
    } else {
      const targetStep = midiToNearestScaleStep(r1, tonicPc, scaleIntervals, basePitch);
      beat4 = scaleStepToMidi(targetStep + (rng() < 0.6 ? -1 : 1), tonicPc, scaleIntervals, basePitch);
    }

    const third = scaleStepToMidi(degs[1] ?? degs[0] + 2, tonicPc, scaleIntervals, basePitch);
    const fifth = scaleStepToMidi(degs[2] ?? degs[0] + 4, tonicPc, scaleIntervals, basePitch);
    const goingUp = beat4 >= r0;
    let beat2 = goingUp ? Math.min(third, fifth) : Math.max(third, fifth);
    let beat3 = goingUp ? Math.max(third, fifth) : Math.min(third, fifth);
    // Range: octave jump on beat 2 — a classic walking gesture.
    if (rng() < range * 0.35) beat2 = r0 + 12;
    // Variation: scale passing tone on beat 3 instead of the chord tone.
    if (rng() < variation * 0.5) {
      const mid = midiToNearestScaleStep(Math.round((beat2 + beat4) / 2), tonicPc, scaleIntervals, basePitch);
      beat3 = scaleStepToMidi(mid, tonicPc, scaleIntervals, basePitch);
    }

    const beats = [r0, beat2, beat3, beat4];
    for (let q = 0; q < 4; q++) {
      const pitch = clamp(beats[q], 24, 60);
      notes.push({
        pitch,
        startTicks: b * ticksPerBar + q * quarter,
        durationTicks: Math.round(gate),
        velocity: Math.round((q === 0 ? 100 : q === 2 ? 92 : 84) + (rng() - 0.5) * 8),
        scaleStep: midiToNearestScaleStep(pitch, tonicPc, scaleIntervals, basePitch),
      });
      // The "and-of-4" skip note — a syncopation device first, density second.
      // Diatonic neighbor so "Pure" chromatics stays pure.
      if (q === 3 && rng() < Math.max(density * 0.35, syncopation * 0.55)) {
        const ss = midiToNearestScaleStep(pitch, tonicPc, scaleIntervals, basePitch) + (rng() < 0.5 ? 1 : -1);
        const skipPitch = clamp(scaleStepToMidi(ss, tonicPc, scaleIntervals, basePitch), 24, 60);
        notes.push({
          pitch: skipPitch,
          startTicks: b * ticksPerBar + q * quarter + Math.round(quarter * 0.66),
          durationTicks: Math.round(quarter * 0.3),
          velocity: 70,
          scaleStep: midiToNearestScaleStep(skipPitch, tonicPc, scaleIntervals, basePitch),
        });
      }
    }
  }
  return { notes, totalBars: bars, ticksPerBar, basePitch, tonicPc, scaleIntervals };
}

// ----- BERLIN SCHOOL SEQUENCE -----
// One 16-step pattern repeated exactly — hypnosis through repetition — with
// tiny mutations every 4 bars. Tangerine Dream / melodic techno DNA.
//
// Fine-tune hooks: syncopation shifts pattern weight onto the off-beats,
// range adds octave jumps, chromatic seeds leading-tone color into slots.
function generateBerlin({ tonicMidi, scaleIntervals, bars = 4, chordProgression = [], sliders = {}, seed = null }) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 0xFFFFFFFF));
  const density = clamp(sliders.density ?? 0.6, 0, 1);
  const variation = clamp(sliders.variation ?? 0.2, 0, 1);
  const syncopation = clamp(sliders.syncopation ?? 0.2, 0, 1);
  const lengthFactor = clamp(sliders.length ?? 0.25, 0, 1);
  const registerSlider = clamp(sliders.register ?? 0.4, 0, 1);
  const range = clamp(sliders.range ?? 0.5, 0, 1);
  const chromatic = clamp(sliders.chromatic ?? 0, 0, 1);

  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const basePitch = Math.round(36 + registerSlider * 36);
  const ticksPerBar = STEPS_PER_BAR * TICKS_PER_STEP;

  // Build THE pattern: 16 slots of { deg, chromaOff } or null.
  const degreePool = [0, 0, 2, 4, 4, 7, 7, 9, 11];
  const newSlot = () => {
    let deg = degreePool[Math.floor(rng() * degreePool.length)];
    if (rng() < range * 0.25) deg += 7;                       // octave jump color
    const chromaOff = rng() < chromatic * 0.25 ? -1 : 0;      // leading-tone color
    return { deg, chromaOff };
  };
  const pattern = new Array(STEPS_PER_BAR).fill(null);
  for (let s = 0; s < STEPS_PER_BAR; s++) {
    // Syncopation moves probability mass from beat heads to off-beats.
    const onProb = s % 4 === 0
      ? 0.9 - syncopation * 0.55
      : 0.35 + density * 0.55 + syncopation * 0.25;
    if (rng() < onProb) pattern[s] = newSlot();
  }
  if (!pattern.some(p => p !== null)) pattern[0] = { deg: 0, chromaOff: 0 };

  const notes = [];
  for (let b = 0; b < bars; b++) {
    if (b > 0 && b % 4 === 0) {
      const mutations = Math.round(variation * 2.5);
      for (let m = 0; m < mutations; m++) {
        const slot = Math.floor(rng() * STEPS_PER_BAR);
        pattern[slot] = rng() < 0.2 ? null : newSlot();
      }
    }
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      const slot = pattern[s];
      if (!slot) continue;
      const pitch = clamp(scaleStepToMidi(slot.deg, tonicPc, scaleIntervals, basePitch) + slot.chromaOff, 0, 127);
      notes.push({
        pitch,
        startTicks: b * ticksPerBar + s * TICKS_PER_STEP,
        durationTicks: Math.max(40, Math.round(TICKS_PER_STEP * (0.4 + lengthFactor * 0.6))),
        velocity: s % 4 === 0 ? 102 : 78,
        scaleStep: slot.deg,
      });
    }
  }
  return { notes, totalBars: bars, ticksPerBar, basePitch, tonicPc, scaleIntervals };
}

// ----- GROOVE (swing + pocket) -----
// Post-processing applied to every engine's output, seeded so iterate-on-tweak
// keeps the same feel.
//
// swing 0..1: shifts off-beats toward a triplet grid. Off-8ths (step % 4 === 2)
// move up to 2/3 of a 16th late, off-16ths (odd steps) up to 1/3 — at swing = 1
// the whole bar sits on a true triplet shuffle.
//
// pocket 0..1: laid-back feel. For drums the kick stays anchored to the grid
// while snare/clap sit furthest back and hats/percussion relax slightly —
// that gap IS the pocket. Melodic material relaxes everything except bar
// downbeats. A few ticks of human jitter come along for free.
function applyGroove(notes, swing, pocket, ticksPerStep, isDrums, rng) {
  if (swing <= 0 && pocket <= 0) return;
  for (const n of notes) {
    const step = Math.round(n.startTicks / ticksPerStep);
    let delay = 0;
    if (swing > 0) {
      if (step % 4 === 2) delay += swing * ticksPerStep * 0.66;
      else if (step % 2 === 1) delay += swing * ticksPerStep * 0.33;
    }
    if (pocket > 0) {
      const layback = pocket * ticksPerStep * 0.22;
      if (isDrums) {
        if (n.pitch === 38 || n.pitch === 39) delay += layback;       // snare/clap
        else if (n.pitch !== 36) delay += layback * 0.6;              // hats/perc
        // kick (36) stays anchored
      } else {
        delay += layback * (step % 16 === 0 ? 0.3 : 1);
      }
      delay += (rng() - 0.5) * pocket * 8;   // ±4 ticks of human jitter
    }
    if (delay !== 0) n.startTicks = Math.max(0, Math.round(n.startTicks + delay));
  }
}

// ----- SAME-PITCH OVERLAP TRIM -----
// Two overlapping notes of the SAME pitch confuse synths and DAWs: the first
// note-off cuts the second note short (MIDI has no per-note identity). Trim
// the earlier note instead. Overlaps between DIFFERENT pitches are left alone —
// that's legato phrasing (and 303 slides depend on it).
function trimSamePitchOverlaps(notes) {
  const byPitch = new Map();
  for (const n of notes) {
    const arr = byPitch.get(n.pitch);
    if (arr) arr.push(n); else byPitch.set(n.pitch, [n]);
  }
  for (const arr of byPitch.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.startTicks - b.startTicks);
    for (let i = 0; i < arr.length - 1; i++) {
      const cur = arr[i];
      const maxEnd = arr[i + 1].startTicks - 5;
      if (cur.startTicks + cur.durationTicks > maxEnd) {
        cur.durationTicks = Math.max(20, maxEnd - cur.startTicks);
      }
    }
  }
}

// ----- 303 ACID SLIDES -----
// Overlapping notes read as glide on TB-303-style synths; exaggerated accent
// contrast is the other half of the acid sound.
function applyAcidSlides(result, slideAmount, rng) {
  const notes = [...result.notes].sort((a, b) => a.startTicks - b.startTicks);
  for (let i = 0; i < notes.length - 1; i++) {
    const cur = notes[i], next = notes[i + 1];
    const gap = next.startTicks - (cur.startTicks + cur.durationTicks);
    if (gap <= TICKS_PER_STEP && rng() < slideAmount) {
      // Slide: extend into the next note so they overlap slightly.
      cur.durationTicks = next.startTicks - cur.startTicks + Math.round(TICKS_PER_STEP * 0.5);
    }
    // Accent contrast: peaks vs valleys.
    cur.velocity = rng() < 0.3 ? 122 : 68 + Math.round(rng() * 14);
  }
  return result;
}

function velocityForStep(step, style, rng) {
  // beat 1 strong, beat 3 medium, off-beats softer; jitter small.
  const beatPos = step % 4;
  const beatNum = Math.floor(step / 4);
  let base = 80;
  if (step === 0) base = 108;
  else if (beatPos === 0) base = 95;
  else if (beatPos === 2) base = 86;
  else base = 76;
  if (style === 'phantom') base += 4;
  if (style === 'pulse') base -= 4;
  return Math.max(40, Math.min(120, Math.round(base + (rng() - 0.5) * 10)));
}

function scaleStepToMidi(scaleStep, tonicPc, scaleIntervals, basePitch) {
  // scaleStep can be negative or > 6 (extra octaves)
  const oct = Math.floor(scaleStep / 7);
  const deg = mod7(scaleStep);
  const interval = scaleIntervals[deg];
  // Anchor: tonic in the octave closest to basePitch.
  const baseOctave = Math.round((basePitch - tonicPc) / 12);
  return tonicPc + 12 * baseOctave + interval + 12 * oct;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ----- Apply a harmonized voice -----
// kind 'parallel' = literal semitone offset (`amount` in semitones, can be chromatic).
// kind 'diatonic' = scale-step offset (`amount` in scale-degrees: +2 = ters upp, +4 = kvint upp etc.).
function applyHarmony(notes, { kind, amount, tonicPc, scaleIntervals, basePitch }) {
  return notes.map(n => {
    let pitch;
    if (kind === 'parallel') {
      pitch = n.pitch + amount;
    } else {
      const newStep = (n.scaleStep ?? 0) + amount;
      pitch = scaleStepToMidi(newStep, tonicPc, scaleIntervals, basePitch) + (n.chromaticOffset || 0);
    }
    return {
      ...n,
      pitch: clamp(pitch, 0, 127),
      velocity: Math.max(40, n.velocity - 14),
    };
  });
}
