// UI controller: presets, sliders, voice management, playback, piano roll, MIDI export.

const SLIDER_DEFS = [
  { id: 'density',     label: 'Densitet',    hint: 'gles melodi → tätt riff' },
  { id: 'variation',   label: 'Variation',   hint: 'upprepar motivet → varierar fritt' },
  { id: 'syncopation', label: 'Synkopering', hint: 'off-beat-attack' },
  { id: 'length',      label: 'Notlängd',    hint: 'staccato / legato' },
  { id: 'register',    label: 'Register',    hint: 'bas → lead' },
  { id: 'range',       label: 'Oktavspann',  hint: 'register-vidd' },
  { id: 'chromatic',   label: 'Kromatik',    hint: 'icke-skala-toner' },
];

// Presets — internal `style` selects rhythm-cell vocabulary; `role` is 'lead' or
// 'bass' (drives root-anchoring and stepwise-bias). `category` groups them in
// the dropdown; `tip` is Swedish advice on sound design and BPM.
const PRESETS = {
  // ─── BAS ───
  basgang: {
    label: 'Basgång',  category: 'Bas',
    style: 'genesis',  role: 'bass',
    density: 0.40, variation: 0.15, syncopation: 0.30,
    length: 0.55, register: 0.05, range: 0.30, chromatic: 0.05,
    tip: 'Saw-bas med lowpass och kort sustain. Funkar 90–115 BPM. Lägg ackordföljden i samma takt — bassen följer grundtonerna.',
  },
  drivingBas: {
    label: 'Driving bas (Justice)',  category: 'Bas',
    style: 'genesis',  role: 'bass',
    density: 0.55, variation: 0.20, syncopation: 0.40,
    length: 0.45, register: 0.15, range: 0.35, chromatic: 0.10,
    tip: 'Saw-bas + distortion + lowpass-filter, kort sustain. För Justice "Genesis"-stil: 116–124 BPM och lägg en oktav-stämma upp med samma ljud.',
  },
  acidBas: {
    label: 'Acid bas (303)',  category: 'Bas',
    style: 'acid',  role: 'bass',
    density: 0.75, variation: 0.35, syncopation: 0.50,
    length: 0.30, register: 0.15, range: 0.40, chromatic: 0.20,
    tip: 'Klassisk TB-303: saw-osc + resonant lowpass + envelope modulation. Automera filter-cutoff och resonance. 125–135 BPM. Höj notlängd för slide.',
  },
  hiphopBas: {
    label: 'Hip-hop bas (half-time)',  category: 'Bas',
    style: 'pulse',  role: 'bass',
    density: 0.20, variation: 0.20, syncopation: 0.20,
    length: 0.85, register: 0.00, range: 0.30, chromatic: 0.00,
    tip: '808-sub eller ren sinus i bottenregister. Långa sustains, sparsamma noter. 70–90 BPM för half-time. Kombinera med trap/drill-trummor.',
  },

  // ─── LEAD ───
  anthem: {
    label: 'Anthem-hook',  category: 'Lead',
    style: 'anthem',  role: 'lead',
    density: 0.40, variation: 0.30, syncopation: 0.20,
    length: 0.70, register: 0.55, range: 0.55, chromatic: 0.00,
    tip: 'Stor saw-lead i unison/stack. Lägg två stämmor (oktav upp + kvint upp diatoniskt). Reverb + ping-pong-delay. Festival/EDM-bredd.',
  },
  funkigLead: {
    label: 'Funkig lead (D.A.N.C.E.)',  category: 'Lead',
    style: 'dance',  role: 'lead',
    density: 0.65, variation: 0.50, syncopation: 0.70,
    length: 0.45, register: 0.55, range: 0.55, chromatic: 0.00,
    tip: 'Pluck eller filtered-saw med kort decay. D.A.N.C.E.-stil. Lägg en låg-oktav-stämma för dans-groove. 116–124 BPM.',
  },
  cosmicDisco: {
    label: 'Cosmic disco (Todd Terje)',  category: 'Lead',
    style: 'cosmic',  role: 'lead',
    density: 0.50, variation: 0.55, syncopation: 0.25,
    length: 0.75, register: 0.50, range: 0.70, chromatic: 0.05,
    tip: 'Saw-lead med långt portamento eller sub-saw + chorus. "Inspector Norse"-glide. Lägg oktav-stämma över. 115–125 BPM.',
  },
  filterHouse: {
    label: 'Filter house (Daft Punk)',  category: 'Lead',
    style: 'filter',  role: 'lead',
    density: 0.55, variation: 0.20, syncopation: 0.55,
    length: 0.50, register: 0.45, range: 0.40, chromatic: 0.00,
    tip: 'Filtered saw loopad i 4 takter. Automera lowpass-cutoff på knob för Daft Punk "Da Funk"-vibe. 120–128 BPM. Lägg oktav-stämma upp.',
  },

  // ─── ARP ───
  italoArp: {
    label: 'Italo arp (Synthwave)',  category: 'Arp',
    style: 'italo',  role: 'lead',
    density: 0.80, variation: 0.30, syncopation: 0.40,
    length: 0.30, register: 0.50, range: 0.65, chromatic: 0.05,
    tip: 'Bright saw med kort decay + dotted 1/16 delay för synthwave/"Drive"-vibe. 110–120 BPM. Oktav-stämma över lyfter arp-en.',
  },
  kromatiskArp: {
    label: 'Kromatisk arp (Phantom)',  category: 'Arp',
    style: 'phantom',  role: 'lead',
    density: 0.85, variation: 0.55, syncopation: 0.45,
    length: 0.30, register: 0.55, range: 0.70, chromatic: 0.40,
    tip: 'Heavy saw + medium distortion. Justice-stil. Lägg två stämmor (oktav upp + kvint upp diatoniskt). 124–132 BPM.',
  },
  pulserande: {
    label: 'Pulserande arp',  category: 'Arp',
    style: 'pulse',  role: 'lead',
    density: 0.25, variation: 0.10, syncopation: 0.15,
    length: 0.35, register: 0.25, range: 0.25, chromatic: 0.00,
    tip: 'Pluck-synth, bell eller marimba. Hypnotisk single-noter. Bra som intro/outro eller hookigt motiv.',
  },

  // ─── MELODI ───
  melody: {
    label: 'Sångmelodi',  category: 'Melodi',
    style: 'anthem',  role: 'lead',
    density: 0.22, variation: 0.65, syncopation: 0.10,
    length: 0.90, register: 0.65, range: 0.50, chromatic: 0.00,
    tip: 'Pad, strings eller mjuk lead med lång attack. Lågt vibrato. Lägg en stämma en oktav under för fyllighet. Bra som verse-melodi.',
  },
  topline: {
    label: 'Topline (vocal-hook)',  category: 'Melodi',
    style: 'topline',  role: 'lead',
    density: 0.30, variation: 0.40, syncopation: 0.15,
    length: 0.80, register: 0.75, range: 0.40, chromatic: 0.00,
    tip: 'Sjungbar lead i högre register. Använd som vocal-replacement över dropp eller refräng. Pluck, klocka eller bright lead.',
  },
  ambient: {
    label: 'Ambient pad-melodi',  category: 'Melodi',
    style: 'ambient',  role: 'lead',
    density: 0.10, variation: 0.45, syncopation: 0.05,
    length: 1.00, register: 0.50, range: 0.40, chromatic: 0.00,
    tip: 'Mellotron, Rhodes eller breath-pad med långt attack och mycket reverb. Funkar som långsam evolverande melodi över en pad-bädd.',
  },

  // ─── ACKORD-RIFF (rytmiska stabs — clav, wurli, piano) ───
  clavRiff: {
    label: 'Clav-riff (funky)',  category: 'Ackord-riff',
    style: 'dance',  role: 'chord',  voicing: 'compact',  extensions: 'ninth',
    density: 0.60, variation: 0.30, syncopation: 0.65,
    length: 0.25, register: 0.55, range: 0.30, chromatic: 0.00,
    tip: 'Clavinet (Hohner D6) eller plucked clav-synth, kort decay, EQ-boost 1–2 kHz. Default: m9/9-ackord (Stevie "Superstition"-flavor). 100–115 BPM. Lägg en ackordföljd som i / VII / VI / VII.',
  },
  wurliStab: {
    label: 'Wurlitzer stab',  category: 'Ackord-riff',
    style: 'anthem',  role: 'chord',  voicing: 'spread',  extensions: 'seven',
    density: 0.35, variation: 0.25, syncopation: 0.45,
    length: 0.55, register: 0.55, range: 0.40, chromatic: 0.00,
    tip: 'Wurlitzer 200A eller Rhodes med tremolo, lätt overdrive och plate-reverb. Default: m7/maj7-ackord — Steely Dan / soul. 90–110 BPM. Off-beat-stabs.',
  },
  pianoStab: {
    label: 'Piano-stab (house)',  category: 'Ackord-riff',
    style: 'filter',  role: 'chord',  voicing: 'wide',  extensions: 'seven',
    density: 0.45, variation: 0.30, syncopation: 0.60,
    length: 0.20, register: 0.60, range: 0.35, chromatic: 0.00,
    tip: 'Akustisk piano eller FM-piano (DX7 E.PIANO 1). Default: m7-ackord (klassisk fransk house). Sidechain mot kick. 118–126 BPM. Daft Punk-feel.',
  },
  neoSoul: {
    label: 'Neo-soul keys (D’Angelo)',  category: 'Ackord-riff',
    style: 'anthem',  role: 'chord',  voicing: 'wide',  extensions: 'thirteenth',
    density: 0.30, variation: 0.50, syncopation: 0.55,
    length: 0.70, register: 0.55, range: 0.45, chromatic: 0.00,
    tip: 'Rhodes Mark V eller akustisk piano med chorus och vintage-comp. Default: m13/maj13-ackord (full jazz-färgning). 75–95 BPM. D’Angelo / Robert Glasper / neo-soul.',
  },
  sus4Stab: {
    label: 'Sus-stab (modern pop)',  category: 'Ackord-riff',
    style: 'filter',  role: 'chord',  voicing: 'spread',  extensions: 'sus4',
    density: 0.40, variation: 0.30, syncopation: 0.40,
    length: 0.40, register: 0.55, range: 0.35, chromatic: 0.00,
    tip: 'Bright pluck eller pad. Default: sus4-ackord — öppen, ambivalent. Funkar som "spänning före upplösning" innan en chorus. Modern pop / electropop. 100–125 BPM.',
  },

  // ─── POLYFONI (kanonisk imitation, fuga) ───
  heavyMetal: {
    label: 'Heavy metal (Justice / barock)',  category: 'Polyfoni',
    style: 'baroque',  role: 'bass',
    density: 0.55, variation: 0.20, syncopation: 0.20,
    length: 0.55, register: 0.18, range: 0.45, chromatic: 0.10,
    tip: 'Distad saw-bas i mid-low register, tonart moll/harmonisk-moll/frygisk. Lägg två stämmor: ① "Oktav upp" med "1 takt senare", ② "Kvint upp (diatonisk)" med "2 takter senare". Ger Justice "Heavy Metal"-effekt. 110–125 BPM, gärna 8 takter.',
  },
  fuga: {
    label: 'Bach-fuga',  category: 'Polyfoni',
    style: 'baroque',  role: 'lead',
    density: 0.55, variation: 0.25, syncopation: 0.15,
    length: 0.70, register: 0.40, range: 0.55, chromatic: 0.15,
    tip: 'Spela på orgel, cembalo eller pluck. Tonart: moll, dorisk eller frygisk. Lägg "Kvint upp diatoniskt" med "1 takt senare" (dux/comes — fugans dominant-svar) och ev. "Oktav upp" med "2 takter senare" för en tredje röst. Använd minst 4 takter.',
  },

  // ─── NYA GENRER (bortom dans) ───
  rockRiff: {
    label: 'Rock-riff (pentatonisk)',  category: 'Lead',
    style: 'rock',  role: 'lead',
    density: 0.50, variation: 0.25, syncopation: 0.25,
    length: 0.40, register: 0.30, range: 0.35, chromatic: 0.05,
    tip: 'Distad gitarr eller tjock unison-synth. Mollpentatonisk skala rekommenderas starkt. 90–140 BPM. Lägg gärna en stämma "Oktav ned" för power-känsla.',
  },
  reggaeBass: {
    label: 'Reggae-bas (dub)',  category: 'Bas',
    style: 'reggae',  role: 'bass',
    density: 0.35, variation: 0.20, syncopation: 0.50,
    length: 0.60, register: 0.05, range: 0.30, chromatic: 0.00,
    tip: 'Rund fingerbas eller subby synth-bas, dämpad diskant, gärna lite dub-delay på annat. 70–90 BPM. Luftig — pauserna är lika viktiga som tonerna.',
  },
  reggaeSkank: {
    label: 'Reggae skank',  category: 'Ackord-riff',
    style: 'reggae',  role: 'chord',  voicing: 'compact',  extensions: 'none',
    density: 0.25, variation: 0.15, syncopation: 0.90,
    length: 0.15, register: 0.60, range: 0.30, chromatic: 0.00,
    tip: 'Gitarr-skank eller orgel-stab på off-beats (2 och 4 i 8-delar). Kort och torrt — staccato är hela poängen. 70–90 BPM. Funkar perfekt ihop med Reggae-bas.',
  },
  montuno: {
    label: 'Latin montuno (piano)',  category: 'Melodi',
    style: 'latin',  role: 'lead',
    density: 0.65, variation: 0.30, syncopation: 0.60,
    length: 0.35, register: 0.60, range: 0.50, chromatic: 0.00,
    tip: 'Akustiskt piano, gärna dubblat i oktaver (lägg stämma "Oktav upp", samtidig). Synkoperat arpeggio-mönster à la salsa/son. 90–110 BPM. Para med Latin percussion-trummorna.',
  },
  tranceArp: {
    label: 'Trance-arp',  category: 'Arp',
    style: 'italo',  role: 'lead',
    density: 0.90, variation: 0.15, syncopation: 0.10,
    length: 0.15, register: 0.65, range: 0.55, chromatic: 0.00,
    tip: 'Supersaw med delay (3/16 ping-pong) och sidechain mot kicken. 16-delar rakt igenom. 132–142 BPM. Lägg stämma "Oktav upp" med "¼ takt senare" för klassisk trance-kaskad.',
  },
  lofiKeys: {
    label: 'Lo-fi keys',  category: 'Ackord-riff',
    style: 'ambient',  role: 'chord',  voicing: 'compact',  extensions: 'ninth',
    density: 0.18, variation: 0.40, syncopation: 0.20,
    length: 0.85, register: 0.50, range: 0.35, chromatic: 0.00,
    tip: 'Rhodes eller piano genom tape-emulering (wow/flutter), lågpass runt 6 kHz, vinyl-knaster. m9-ackord i långsamt tempo, 70–85 BPM. Lo-fi hip-hop / study beats.',
  },

  // ─── TRUMMOR (GM kanal 10) ───
  drumsHouse: {
    label: 'House 4x4',  category: 'Trummor',
    role: 'drums',  drumStyle: 'house',
    density: 0.50, variation: 0.30, syncopation: 0.20,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: 'Klassisk house: kick på varje fjärdedel, clap på 2 & 4, off-beat hats. 120–128 BPM. Exportera och dra in på ett GM-trumspår eller mappa om till din sampler.',
  },
  drumsTechno: {
    label: 'Techno (minimal)',  category: 'Trummor',
    role: 'drums',  drumStyle: 'techno',
    density: 0.55, variation: 0.20, syncopation: 0.30,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: 'Maskinell 16-dels-hihat, hård kick, sparsamma rimshots. 125–135 BPM. Höj Densitet för tätare hi-hats, Variation för mer rörelse.',
  },
  drumsDisco: {
    label: 'Disco',  category: 'Trummor',
    role: 'drums',  drumStyle: 'disco',
    density: 0.55, variation: 0.30, syncopation: 0.15,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: 'Four-on-the-floor med öppen hi-hat på varje off-beat ("pea soup") och tamburin. 110–122 BPM. Para med Cosmic disco-basen!',
  },
  drumsRock: {
    label: 'Rock-komp',  category: 'Trummor',
    role: 'drums',  drumStyle: 'rock',
    density: 0.45, variation: 0.40, syncopation: 0.15,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: 'Rakt rock-komp: kick 1 & 3, virvel 2 & 4, 8-dels-hats, crash på fraser. 90–140 BPM. Höj Variation för fler tom-fills.',
  },
  drumsFunk: {
    label: 'Funk breakbeat',  category: 'Trummor',
    role: 'drums',  drumStyle: 'funkbreak',
    density: 0.60, variation: 0.45, syncopation: 0.50,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: 'Synkoperad kick, ghost notes på virveln, 16-dels-hats à la Funky Drummer. 95–110 BPM. Densitet styr ghost-tätheten.',
  },
  drumsLatin: {
    label: 'Latin percussion',  category: 'Trummor',
    role: 'drums',  drumStyle: 'latin',
    density: 0.60, variation: 0.30, syncopation: 0.40,
    length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00,
    tip: '3-2 son-clave, congas, cowbell på fjärdedelar, shaker-16-delar. 90–115 BPM. Lägg ovanpå valfritt komp — eller para med Latin montuno.',
  },
};

const VOICE_OPTIONS = [
  { label: 'Oktav ned',                kind: 'parallel', amount: -12 },
  { label: 'Kvint ned (parallell)',    kind: 'parallel', amount: -7 },
  { label: 'Ters ned (diatonisk)',     kind: 'diatonic', amount: -2 },
  { label: 'Ters upp (diatonisk)',     kind: 'diatonic', amount: 2 },
  { label: 'Kvart upp (diatonisk)',    kind: 'diatonic', amount: 3 },
  { label: 'Kvint upp (diatonisk)',    kind: 'diatonic', amount: 4 },
  { label: 'Sext upp (diatonisk)',     kind: 'diatonic', amount: 5 },
  { label: 'Oktav upp',                kind: 'parallel', amount: 12 },
  { label: 'Oktav + kvint upp',        kind: 'parallel', amount: 19 },
  { label: 'Två oktaver upp',          kind: 'parallel', amount: 24 },
];

// Kanonisk fördröjning per stämma. Mätt i 16-delssteg (16 steg = 1 takt).
// Funkar för Bach-fuga och Justice "Heavy Metal"-effekt: röster spelar
// samma motiv men fasförskjutet.
const VOICE_DELAYS = [
  { label: 'samtidig',         steps: 0 },
  { label: '¼ takt senare',    steps: 4 },
  { label: '½ takt senare',    steps: 8 },
  { label: '1 takt senare',    steps: 16 },
  { label: '2 takter senare',  steps: 32 },
  { label: '4 takter senare',  steps: 64 },
];

const STATE = {
  style: 'genesis',
  role: 'lead',
  voicing: 'compact',
  extensions: 'none',
  drumStyle: null,
  presetKey: 'basgang',
  sliders: {},
  voices: [],
  currentResult: null,
  currentSeed: null,
};

const EXTENSION_OPTIONS = [
  { value: 'none',       label: 'Triad (3-toners)' },
  { value: 'seven',      label: '7:a (m7 / maj7)' },
  { value: 'dom7',       label: 'Dominant 7 (b7)' },
  { value: 'ninth',      label: '9:a (m9 / maj9)' },
  { value: 'add9',       label: 'add9 (triad + 9)' },
  { value: 'six',        label: 'Sext (6:a)' },
  { value: 'sus2',       label: 'sus2' },
  { value: 'sus4',       label: 'sus4' },
  { value: 'thirteenth', label: '13:a (full jazz)' },
];

let synthMain, synthHarm, transportPart;
let playStarting = false;  // guard against rapid double-clicks on Play

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  buildSliders();
  bindPresets();
  bindVoiceUI();
  bindActions();
  applyPreset('basgang');
  generate();
});

function buildSliders() {
  const root = document.getElementById('sliders');
  root.innerHTML = '';
  for (const def of SLIDER_DEFS) {
    const wrap = document.createElement('div');
    wrap.className = 'slider';
    wrap.innerHTML = `
      <label>
        <span>${def.label} <span style="opacity:.55;text-transform:none;letter-spacing:0;font-size:11px">${def.hint}</span></span>
        <span class="value" data-value="${def.id}">0</span>
      </label>
      <input type="range" min="0" max="100" step="1" id="slider-${def.id}" data-slider="${def.id}">
    `;
    root.appendChild(wrap);
  }
  for (const def of SLIDER_DEFS) {
    const el = document.getElementById(`slider-${def.id}`);
    el.addEventListener('input', e => {
      STATE.sliders[def.id] = e.target.value / 100;
      document.querySelector(`[data-value="${def.id}"]`).textContent = e.target.value;
    });
  }
  refreshSliderUI();
}

function refreshSliderUI() {
  for (const def of SLIDER_DEFS) {
    const v = Math.round((STATE.sliders[def.id] ?? 0) * 100);
    const el = document.getElementById(`slider-${def.id}`);
    if (el) el.value = v;
    const valEl = document.querySelector(`[data-value="${def.id}"]`);
    if (valEl) valEl.textContent = v;
  }
}

// Category order in the dropdown — must include every value used in PRESETS.
const CATEGORY_ORDER = ['Bas', 'Lead', 'Arp', 'Ackord-riff', 'Melodi', 'Polyfoni', 'Trummor'];

function bindPresets() {
  const select = document.getElementById('preset-select');
  select.innerHTML = '';
  for (const cat of CATEGORY_ORDER) {
    const group = document.createElement('optgroup');
    group.label = cat;
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (preset.category !== cat) continue;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = preset.label;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
  select.addEventListener('change', e => applyPreset(e.target.value));

  // Populate the extensions dropdown (visible only when role === 'chord').
  const extSel = document.getElementById('extensions-select');
  if (extSel) {
    extSel.innerHTML = EXTENSION_OPTIONS
      .map(o => `<option value="${o.value}">${o.label}</option>`)
      .join('');
    extSel.addEventListener('change', e => { STATE.extensions = e.target.value; });
  }
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  STATE.style = preset.style ?? STATE.style;
  STATE.role = preset.role ?? 'lead';
  STATE.voicing = preset.voicing ?? 'compact';
  STATE.extensions = preset.extensions ?? 'none';
  STATE.drumStyle = preset.drumStyle ?? null;
  STATE.presetKey = name;
  for (const def of SLIDER_DEFS) STATE.sliders[def.id] = preset[def.id];
  const select = document.getElementById('preset-select');
  if (select) select.value = name;
  const tipEl = document.getElementById('preset-tip');
  if (tipEl) tipEl.textContent = preset.tip ?? '';
  refreshExtensionsUI();
  refreshPanelVisibility();
  refreshSliderUI();
}

// Layout-säkring: hide controls that don't apply to the current role so the UI
// never shows knobs that silently do nothing.
//  - drums: no key/scale, no chord progression, no voices, no pitch-related sliders
//  - others: everything visible
const DRUM_HIDDEN_SLIDERS = ['length', 'register', 'range', 'chromatic'];

function refreshPanelVisibility() {
  const isDrums = STATE.role === 'drums';

  const progPanel = document.getElementById('panel-progression');
  if (progPanel) progPanel.style.display = isDrums ? 'none' : '';
  const voicesPanel = document.getElementById('panel-voices');
  if (voicesPanel) voicesPanel.style.display = isDrums ? 'none' : '';

  // Key + scale selects live inside labels in the Tonart & form grid.
  for (const id of ['root', 'scale']) {
    const el = document.getElementById(id);
    if (el) el.closest('label').style.display = isDrums ? 'none' : '';
  }

  // Pitch-related sliders are meaningless for drums.
  for (const id of DRUM_HIDDEN_SLIDERS) {
    const input = document.getElementById(`slider-${id}`);
    if (input) input.closest('.slider').style.display = isDrums ? 'none' : '';
  }
}

// Show / sync the extensions dropdown (only meaningful for chord-role presets).
function refreshExtensionsUI() {
  const wrapper = document.getElementById('extensions-wrap');
  const select = document.getElementById('extensions-select');
  if (!wrapper || !select) return;
  const showIt = STATE.role === 'chord';
  wrapper.style.display = showIt ? '' : 'none';
  if (showIt) select.value = STATE.extensions;
}

// ---------- VOICES ----------
function bindVoiceUI() {
  document.getElementById('add-voice').addEventListener('click', () => {
    STATE.voices.push({ optionIndex: 7, delayIndex: 0, velOffset: -10 }); // default: octave up, samtidig
    renderVoices();
  });
}

function renderVoices() {
  const root = document.getElementById('voices');
  root.innerHTML = '';
  STATE.voices.forEach((voice, idx) => {
    const row = document.createElement('div');
    row.className = 'voice-row';
    row.innerHTML = `
      <span class="voice-num">${idx + 1}</span>
      <label>Intervall
        <select data-voice-interval="${idx}">
          ${VOICE_OPTIONS.map((o, i) => `<option value="${i}" ${i === voice.optionIndex ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>
      <label>Fördröjning
        <select data-voice-delay="${idx}">
          ${VOICE_DELAYS.map((d, i) => `<option value="${i}" ${i === (voice.delayIndex ?? 0) ? 'selected' : ''}>${d.label}</option>`).join('')}
        </select>
      </label>
      <label>Velocity
        <select data-voice-vel="${idx}">
          <option value="0" ${voice.velOffset === 0 ? 'selected' : ''}>0</option>
          <option value="-10" ${(voice.velOffset ?? -10) === -10 ? 'selected' : ''}>-10</option>
          <option value="-20" ${voice.velOffset === -20 ? 'selected' : ''}>-20</option>
          <option value="-30" ${voice.velOffset === -30 ? 'selected' : ''}>-30</option>
        </select>
      </label>
      <button class="remove-voice" data-remove="${idx}" title="Ta bort">×</button>
    `;
    root.appendChild(row);
  });
  root.querySelectorAll('[data-voice-interval]').forEach(s => {
    s.addEventListener('change', e => {
      STATE.voices[+e.target.dataset.voiceInterval].optionIndex = +e.target.value;
    });
  });
  root.querySelectorAll('[data-voice-delay]').forEach(s => {
    s.addEventListener('change', e => {
      STATE.voices[+e.target.dataset.voiceDelay].delayIndex = +e.target.value;
    });
  });
  root.querySelectorAll('[data-voice-vel]').forEach(s => {
    s.addEventListener('change', e => {
      STATE.voices[+e.target.dataset.voiceVel].velOffset = +e.target.value;
    });
  });
  root.querySelectorAll('[data-remove]').forEach(b => {
    b.addEventListener('click', e => {
      STATE.voices.splice(+e.target.dataset.remove, 1);
      renderVoices();
    });
  });
}

// ---------- ACTIONS ----------
function bindActions() {
  document.getElementById('random').addEventListener('click', randomize);
  document.getElementById('generate').addEventListener('click', generate);
  document.getElementById('play').addEventListener('click', play);
  document.getElementById('stop').addEventListener('click', stop);
  document.getElementById('download').addEventListener('click', download);
  document.getElementById('clear-prog').addEventListener('click', () => {
    document.getElementById('progression').value = '';
  });
}

function randomize() {
  // Random key
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  document.getElementById('root').value = roots[Math.floor(Math.random() * roots.length)];
  const scales = ['minor', 'minor', 'minor', 'phrygian', 'dorian', 'harmonic-minor', 'minor-pent', 'blues'];
  document.getElementById('scale').value = scales[Math.floor(Math.random() * scales.length)];

  // Random preset, then nudge each slider
  const presetKeys = Object.keys(PRESETS);
  const presetName = presetKeys[Math.floor(Math.random() * presetKeys.length)];
  applyPreset(presetName);
  for (const def of SLIDER_DEFS) {
    const nudge = (Math.random() - 0.5) * 0.3;
    STATE.sliders[def.id] = Math.max(0, Math.min(1, STATE.sliders[def.id] + nudge));
  }
  refreshSliderUI();

  // Random bars (4 or 8 mostly)
  const bars = [4, 4, 4, 8, 8, 2][Math.floor(Math.random() * 6)];
  document.getElementById('bars').value = bars;

  generate();
}

function readUI() {
  const rootName = document.getElementById('root').value;
  const scaleName = document.getElementById('scale').value;
  const bars = parseInt(document.getElementById('bars').value, 10);
  const bpm = parseInt(document.getElementById('bpm').value, 10);
  const progressionText = document.getElementById('progression').value.trim();

  const tonicPc = pitchClassFromName(rootName);
  // Anchor tonic around MIDI 48 (C3-ish) so register slider has room.
  const tonicMidi = 48 + tonicPc;
  const scaleIntervals = SCALES[scaleName] || SCALES.minor;
  const chordProgression = parseProgression(progressionText, tonicMidi, scaleIntervals);

  return { rootName, scaleName, bars, bpm, tonicMidi, scaleIntervals, chordProgression };
}

function generate() {
  const ui = readUI();
  const seed = Math.floor(Math.random() * 0xFFFFFFFF);
  STATE.currentSeed = seed;

  if (STATE.role === 'drums') {
    const result = generateDrums({
      drumStyle: STATE.drumStyle,
      bars: ui.bars,
      sliders: STATE.sliders,
      seed,
    });
    STATE.currentResult = { main: result, voices: [], bars: ui.bars, bpm: ui.bpm, isDrums: true };
    const label = PRESETS[STATE.presetKey]?.label ?? 'Trummor';
    document.getElementById('seed-display').textContent =
      `seed: ${seed.toString(16).padStart(8, '0')}   ·   ${ui.bars} takter @ ${ui.bpm} bpm   ·   ${label}`;
    renderPianoRoll();
    return;
  }

  const result = generateRiff({
    tonicMidi: ui.tonicMidi,
    scaleIntervals: ui.scaleIntervals,
    bars: ui.bars,
    bpm: ui.bpm,
    style: STATE.style,
    role: STATE.role,
    voicing: STATE.voicing,
    extensions: STATE.extensions,
    chordProgression: ui.chordProgression,
    sliders: STATE.sliders,
    seed,
  });

  // Build harmonized voices with optional canonic delay. Done in a single pass:
  // pre-filter source notes by whether they'd still fall inside the phrase, then
  // harmonize + shift + clamp duration in one go (was 3 chained maps + filter).
  const totalTicks = ui.bars * result.ticksPerBar;
  const TICKS_PER_STEP = result.ticksPerBar / 16;
  const voiceTracks = STATE.voices.map(v => {
    const opt = VOICE_OPTIONS[v.optionIndex];
    const delayTicks = VOICE_DELAYS[v.delayIndex ?? 0].steps * TICKS_PER_STEP;
    const velOffset = v.velOffset ?? -10;

    // Drop source notes whose shifted start would already be past the phrase end.
    // Skips wasted applyHarmony work when delay swallows the whole phrase.
    const sourceNotes = delayTicks === 0
      ? result.notes
      : result.notes.filter(n => n.startTicks + delayTicks < totalTicks);
    if (sourceNotes.length === 0) return [];

    const harmonized = applyHarmony(sourceNotes, {
      kind: opt.kind,
      amount: opt.amount,
      tonicPc: result.tonicPc,
      scaleIntervals: result.scaleIntervals,
      basePitch: result.basePitch,
    });

    const out = new Array(harmonized.length);
    for (let i = 0; i < harmonized.length; i++) {
      const n = harmonized[i];
      const startTicks = n.startTicks + delayTicks;
      const remaining = totalTicks - startTicks;
      out[i] = {
        pitch: n.pitch,
        startTicks,
        durationTicks: Math.max(60, Math.min(n.durationTicks, remaining)),
        velocity: Math.max(35, Math.min(120, n.velocity + velOffset)),
        scaleStep: n.scaleStep,
        chromaticOffset: n.chromaticOffset,
      };
    }
    return out;
  });

  STATE.currentResult = {
    main: result,
    voices: voiceTracks,
    bars: ui.bars,
    bpm: ui.bpm,
  };

  const styleLabel = PRESETS[STATE.presetKey]?.label ?? STATE.style;
  document.getElementById('seed-display').textContent =
    `seed: ${seed.toString(16).padStart(8, '0')}   ·   ${ui.rootName} ${ui.scaleName}   ·   ${ui.bars} takter @ ${ui.bpm} bpm   ·   ${styleLabel}`;

  renderPianoRoll();
}

// ---------- PIANO ROLL ----------
// Renders a flat SVG once per generate. For ~500 nodes, building an HTML string
// and assigning via innerHTML is several times faster than per-element createElementNS.
function renderPianoRoll() {
  const container = document.getElementById('piano-roll');
  if (!STATE.currentResult) { container.innerHTML = ''; return; }
  if (STATE.currentResult.isDrums) { renderDrumRoll(container); return; }
  const { main, voices, bars } = STATE.currentResult;

  // Find pitch range without spreading large arrays.
  let minPitch = Infinity, maxPitch = -Infinity;
  for (const n of main.notes) {
    if (n.pitch < minPitch) minPitch = n.pitch;
    if (n.pitch > maxPitch) maxPitch = n.pitch;
  }
  for (const tr of voices) for (const n of tr) {
    if (n.pitch < minPitch) minPitch = n.pitch;
    if (n.pitch > maxPitch) maxPitch = n.pitch;
  }
  if (minPitch === Infinity) { container.innerHTML = ''; return; }
  minPitch -= 1; maxPitch += 1;
  const pitchRange = maxPitch - minPitch + 1;

  const ticksTotal = bars * main.ticksPerBar;
  const width = 900;
  const rowH = Math.max(6, Math.min(14, Math.floor(220 / pitchRange)));
  const height = Math.max(160, rowH * pitchRange);
  const totalSteps = bars * STEPS_PER_BAR;

  // Build SVG markup as a single string — far less DOM thrash than appendChild loops.
  const parts = [`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`];

  // Vertical gridlines (per step).
  for (let i = 0; i <= totalSteps; i++) {
    const x = (i / totalSteps) * width;
    const cls = i % STEPS_PER_BAR === 0 ? 'gridline-bar'
              : i % STEPS_PER_BEAT === 0 ? 'gridline-beat'
              : 'gridline';
    parts.push(`<line class="${cls}" x1="${x}" y1="0" x2="${x}" y2="${height}"/>`);
  }
  // Horizontal C-octave lines.
  for (let p = minPitch; p <= maxPitch; p++) {
    if (p % 12 === 0) {
      const y = (maxPitch - p) * rowH + rowH;
      parts.push(`<line class="gridline-beat" x1="0" y1="${y}" x2="${width}" y2="${y}"/>`);
    }
  }
  // Harmony notes (drawn first so main sits on top).
  for (const tr of voices) for (const n of tr) appendNoteRect(parts, n, minPitch, maxPitch, rowH, width, ticksTotal, true);
  for (const n of main.notes) appendNoteRect(parts, n, minPitch, maxPitch, rowH, width, ticksTotal, false);

  parts.push('</svg>');
  container.innerHTML = parts.join('');
}

// Drum view: one labeled lane per instrument instead of a pitch grid.
function renderDrumRoll(container) {
  const { main, bars } = STATE.currentResult;
  if (main.notes.length === 0) { container.innerHTML = ''; return; }

  // Collect used instruments, order: cymbals/perc on top, kick at bottom.
  const LANE_ORDER = [49, 51, 46, 42, 54, 70, 56, 75, 63, 62, 50, 47, 45, 37, 39, 38, 36];
  const used = [...new Set(main.notes.map(n => n.pitch))];
  used.sort((a, b) => LANE_ORDER.indexOf(a) - LANE_ORDER.indexOf(b));

  const ticksTotal = bars * main.ticksPerBar;
  const gutter = 78;
  const width = 900;
  const rowH = 20;
  const height = used.length * rowH;
  const totalSteps = bars * STEPS_PER_BAR;
  const laneOf = new Map(used.map((p, i) => [p, i]));

  const parts = [`<svg viewBox="0 0 ${width + gutter} ${height}" preserveAspectRatio="none">`];

  // Lane backgrounds (alternating) + labels.
  for (let i = 0; i < used.length; i++) {
    if (i % 2 === 0) {
      parts.push(`<rect x="${gutter}" y="${i * rowH}" width="${width}" height="${rowH}" fill="rgba(0,0,0,0.025)"/>`);
    }
    const label = DRUM_LABELS[used[i]] ?? used[i];
    parts.push(`<text x="4" y="${i * rowH + rowH / 2 + 4}" class="drum-label">${label}</text>`);
  }
  // Vertical gridlines.
  for (let i = 0; i <= totalSteps; i++) {
    const x = gutter + (i / totalSteps) * width;
    const cls = i % STEPS_PER_BAR === 0 ? 'gridline-bar'
              : i % STEPS_PER_BEAT === 0 ? 'gridline-beat'
              : 'gridline';
    parts.push(`<line class="${cls}" x1="${x}" y1="0" x2="${x}" y2="${height}"/>`);
  }
  // Hits — opacity follows velocity so accents/ghosts are visible.
  for (const n of main.notes) {
    const lane = laneOf.get(n.pitch);
    const x = gutter + (n.startTicks / ticksTotal) * width;
    const w = Math.max(3, (n.durationTicks / ticksTotal) * width * 0.8);
    const y = lane * rowH + 3;
    const op = (0.35 + (n.velocity / 127) * 0.65).toFixed(2);
    parts.push(`<rect class="note" x="${x}" y="${y}" width="${w}" height="${rowH - 6}" rx="2" opacity="${op}"/>`);
  }

  parts.push('</svg>');
  container.innerHTML = parts.join('');
}

function appendNoteRect(parts, n, minPitch, maxPitch, rowH, width, ticksTotal, harm) {
  const x = (n.startTicks / ticksTotal) * width;
  let w = (n.durationTicks / ticksTotal) * width;
  if (w < 2) w = 2;
  const y = (maxPitch - n.pitch) * rowH;
  const cls = harm ? 'note harm' : 'note';
  parts.push(`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${rowH - 1}" rx="2"/>`);
}

// ---------- PLAYBACK (Tone.js) ----------
// ---------- DRUM KIT (Tone.js synthesis, no samples needed) ----------
let drumKit = null;

function ensureDrumKit() {
  if (drumKit) return;
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 6,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0.005, release: 0.1 },
  }).toDestination();

  const tom = new Tone.MembraneSynth({
    pitchDecay: 0.06, octaves: 3,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.1 },
  }).toDestination();

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
  });
  snare.chain(new Tone.Filter(1800, 'bandpass', -12), new Tone.Volume(-4), Tone.Destination);

  const clap = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.003, decay: 0.22, sustain: 0 },
  });
  clap.chain(new Tone.Filter(1200, 'bandpass'), new Tone.Volume(-6), Tone.Destination);

  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
  });
  hat.chain(new Tone.Filter(9000, 'highpass'), new Tone.Volume(-12), Tone.Destination);

  const ohat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.28, sustain: 0 },
  });
  ohat.chain(new Tone.Filter(8000, 'highpass'), new Tone.Volume(-14), Tone.Destination);

  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.6, release: 0.1 },
    harmonicity: 5.1, modulationIndex: 24, resonance: 4000, octaves: 1.2,
  });
  metal.chain(new Tone.Volume(-16), Tone.Destination);

  const perc = new Tone.MembraneSynth({
    pitchDecay: 0.02, octaves: 2,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
  });
  perc.chain(new Tone.Volume(-6), Tone.Destination);

  drumKit = { kick, tom, snare, clap, hat, ohat, metal, perc };
}

// Route a GM drum pitch to the right synth voice.
function triggerDrum(gmPitch, time, vel, dur) {
  const k = drumKit;
  if (!k) return;
  switch (gmPitch) {
    case 36: k.kick.triggerAttackRelease('C1', 0.25, time, vel); break;
    case 38: k.snare.triggerAttackRelease(0.16, time, vel); break;
    case 37: k.snare.triggerAttackRelease(0.05, time, vel * 0.8); break;
    case 39: k.clap.triggerAttackRelease(0.2, time, vel); break;
    case 42: k.hat.triggerAttackRelease(0.04, time, vel); break;
    case 46: k.ohat.triggerAttackRelease(0.25, time, vel); break;
    case 49: k.metal.triggerAttackRelease('C5', 0.8, time, vel * 0.7); break;
    case 51: k.metal.triggerAttackRelease('D5', 0.4, time, vel * 0.5); break;
    case 45: k.tom.triggerAttackRelease('G2', 0.25, time, vel); break;
    case 47: k.tom.triggerAttackRelease('B2', 0.25, time, vel); break;
    case 50: k.tom.triggerAttackRelease('D3', 0.25, time, vel); break;
    case 54: k.hat.triggerAttackRelease(0.08, time, vel * 0.8); break;
    case 56: k.metal.triggerAttackRelease('A5', 0.12, time, vel * 0.6); break;
    case 70: k.hat.triggerAttackRelease(0.06, time, vel * 0.7); break;
    case 75: k.perc.triggerAttackRelease('E5', 0.07, time, vel); break;
    case 63: k.perc.triggerAttackRelease('C4', 0.12, time, vel); break;
    case 62: k.perc.triggerAttackRelease('A3', 0.08, time, vel); break;
    default: k.perc.triggerAttackRelease('C4', 0.1, time, vel);
  }
}

async function ensureSynths() {
  await Tone.start();
  if (!synthMain) {
    synthMain = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.25, release: 0.12 },
    });
    const filter = new Tone.Filter(2200, 'lowpass');
    const dist = new Tone.Distortion(0.15);
    synthMain.chain(filter, dist, Tone.Destination);
  }
  if (!synthHarm) {
    synthHarm = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.1 },
    });
    const filter = new Tone.Filter(1800, 'lowpass');
    const vol = new Tone.Volume(-6);
    synthHarm.chain(filter, vol, Tone.Destination);
  }
}

function killAllPlayback() {
  // The order matters: dispose scheduled events first, then silence voices.
  if (transportPart) {
    try { transportPart.stop(0); transportPart.dispose(); } catch (e) {}
    transportPart = null;
  }
  if (typeof Tone !== 'undefined' && Tone.Transport) {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
  }
  if (synthMain) synthMain.releaseAll();
  if (synthHarm) synthHarm.releaseAll();
}

async function play() {
  if (playStarting) return;       // ignore rapid double-clicks while we set up
  playStarting = true;
  try {
    if (!STATE.currentResult) generate();
    await ensureSynths();
    if (STATE.currentResult.isDrums) ensureDrumKit();
    killAllPlayback();

    const { main, voices, bpm, isDrums } = STATE.currentResult;
    Tone.Transport.bpm.value = bpm;
    const secPerTick = 60 / (bpm * PPQ);
    // Direct MIDI→Hz instead of allocating a Tone.Frequency object per note.
    const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);

    const events = [];
    for (const n of main.notes) {
      events.push(isDrums
        ? {
            time: n.startTicks * secPerTick,
            midi: n.pitch,
            dur: Math.max(0.04, n.durationTicks * secPerTick),
            vel: n.velocity / 127,
            synth: 'drum',
          }
        : {
            time: n.startTicks * secPerTick,
            pitch: midiToHz(n.pitch),
            dur: Math.max(0.04, n.durationTicks * secPerTick),
            vel: n.velocity / 127,
            synth: 'main',
          });
    }
    for (const tr of voices) {
      for (const n of tr) {
        events.push({
          time: n.startTicks * secPerTick,
          pitch: midiToHz(n.pitch),
          dur: Math.max(0.04, n.durationTicks * secPerTick),
          vel: n.velocity / 127,
          synth: 'harm',
        });
      }
    }

    transportPart = new Tone.Part((time, ev) => {
      if (ev.synth === 'drum') {
        triggerDrum(ev.midi, time, ev.vel, ev.dur);
        return;
      }
      const synth = ev.synth === 'main' ? synthMain : synthHarm;
      synth.triggerAttackRelease(ev.pitch, ev.dur, time, ev.vel);
    }, events);
    transportPart.start(0);

    // Hard-release everything when the phrase ends — without this, long final
    // notes could outlive Transport.stop and ring indefinitely.
    const totalSec = STATE.currentResult.bars * main.ticksPerBar * secPerTick;
    Tone.Transport.scheduleOnce(t => {
      if (synthMain) synthMain.releaseAll(t);
      if (synthHarm) synthHarm.releaseAll(t);
      Tone.Transport.stop(t + 0.05);
    }, totalSec + 0.1);

    Tone.Transport.start();
  } finally {
    playStarting = false;
  }
}

function stop() {
  killAllPlayback();
}

// ---------- MIDI DOWNLOAD ----------
function download() {
  if (!STATE.currentResult) generate();
  const { main, voices, bpm, isDrums } = STATE.currentResult;
  const seedHex = (STATE.currentSeed >>> 0).toString(16).padStart(8, '0');

  let tracks, filename;
  if (isDrums) {
    // GM drums live on channel 10 (index 9); no program change needed.
    tracks = [{ name: 'Drums', channel: 9, notes: main.notes }];
    filename = `drums_${STATE.drumStyle}_${seedHex}.mid`;
  } else {
    tracks = [
      { name: 'Riff', channel: 0, program: 81, notes: main.notes }, // 81 = Lead 1 (square)
    ];
    voices.forEach((v, i) => {
      tracks.push({ name: `Stämma ${i + 1}`, channel: i + 1, program: 80, notes: v });
    });
    const ui = readUI();
    filename = `riff_${ui.rootName.replace('#', 's')}_${ui.scaleName}_${STATE.style}_${seedHex}.mid`;
  }

  const bytes = writeMidi({ bpm, tracks });
  downloadMidi(bytes, filename);
}
