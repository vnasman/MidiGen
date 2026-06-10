// UI controller: presets, sliders, voice management, playback, piano roll, MIDI export.

// Each control is a 5-step segmented picker. Internal values stay continuous
// 0..1 (presets keep their tuned numbers); the UI highlights the nearest step
// and clicking a step sets the exact value i/4.
const SLIDER_DEFS = [
  { id: 'density',     label: 'Densitet',    levels: ['Gles', 'Luftig', 'Lagom', 'Tät', 'Hektisk'] },
  { id: 'variation',   label: 'Variation',   levels: ['Statisk', 'Lite', 'Lagom', 'Mycket', 'Fri'] },
  { id: 'syncopation', label: 'Synkopering', levels: ['Rak', 'Lätt', 'Lagom', 'Synkig', 'Off-beat'] },
  { id: 'length',      label: 'Notlängd',    levels: ['Staccato', 'Kort', 'Lagom', 'Lång', 'Legato'] },
  { id: 'register',    label: 'Register',    levels: ['Djup bas', 'Bas', 'Mitt', 'Hög', 'Topp'] },
  { id: 'range',       label: 'Oktavspann',  levels: ['Smal', 'Snäv', 'Lagom', 'Vid', 'Bred'] },
  { id: 'chromatic',   label: 'Kromatik',    levels: ['Ren', 'Nästan', 'Lite', 'En del', 'Mycket'] },
];

// ── Roll × Genre-matris ──────────────────────────────────────────────
// Varje kombination (roll, genre) löses till ett recept: motor + stil-DNA +
// slider-defaults + tips. ROLE_BASE ger grundvärden per roll; recepten
// överskriver bara det som avviker.

const ROLES = [
  { id: 'bass',   label: 'Bas' },
  { id: 'lead',   label: 'Lead' },
  { id: 'melody', label: 'Melodi' },
  { id: 'chord',  label: 'Ackord' },
  { id: 'arp',    label: 'Arp' },
  { id: 'drums',  label: 'Trummor' },
];

const GENRES = [
  { id: 'french',  label: 'French house' },
  { id: 'disco',   label: 'Disco' },
  { id: 'rock',    label: 'Rock' },
  { id: 'reggae',  label: 'Reggae' },
  { id: 'latin',   label: 'Latin' },
  { id: 'baroque', label: 'Barock' },
  { id: 'jazz',    label: 'Jazz/Soul' },
  { id: 'synth',   label: 'Synth/Trance' },
  { id: 'lofi',    label: 'Lo-fi' },
  { id: 'minimal', label: 'Minimal' },
];

const ROLE_BASE = {
  bass:   { density: 0.50, variation: 0.20, syncopation: 0.35, length: 0.50, register: 0.10, range: 0.30, chromatic: 0.05 },
  lead:   { density: 0.60, variation: 0.40, syncopation: 0.40, length: 0.45, register: 0.55, range: 0.50, chromatic: 0.05 },
  melody: { density: 0.25, variation: 0.60, syncopation: 0.15, length: 0.85, register: 0.60, range: 0.45, chromatic: 0.00 },
  chord:  { density: 0.45, variation: 0.30, syncopation: 0.50, length: 0.30, register: 0.55, range: 0.35, chromatic: 0.00 },
  arp:    { density: 0.70, variation: 0.20, syncopation: 0.10, length: 0.30, register: 0.55, range: 0.50, chromatic: 0.00 },
  drums:  { density: 0.50, variation: 0.35, syncopation: 0.25, length: 0.50, register: 0.50, range: 0.50, chromatic: 0.00 },
};

// engine: 'riff' (Markov+mallar), 'vocal' (riff med sångbarhets-bias),
// 'arp' (deterministisk arpeggiator), 'walking', 'berlin', 'drums'.
const RECIPES = {
  bass: {
    french:  { engine: 'riff', style: 'genesis', tip: 'Justice-bas: distad saw, kort sustain, lowpass. 110–125 BPM.' },
    disco:   { engine: 'arp', pattern: 'octave', sliders: { density: 0.30, register: 0.05, length: 0.45 }, tip: 'Oktav-studs à la Chic / "Around the World". Fingerbas eller synthbas med pluck. 110–122 BPM.' },
    rock:    { engine: 'riff', style: 'rock', sliders: { register: 0.15, length: 0.40 }, tip: 'Pentatonisk power-bas — dubbla gärna gitarrens riff. 90–140 BPM.' },
    reggae:  { engine: 'riff', style: 'reggae', sliders: { density: 0.35, syncopation: 0.50, length: 0.60, register: 0.05 }, tip: 'Dub-bas: rund, dämpad diskant, pauserna bär grooven. 70–90 BPM.' },
    latin:   { engine: 'riff', style: 'latin', sliders: { syncopation: 0.60 }, tip: 'Tumbao-känsla — synkoperad rot/kvint. Para med Latin-trummor. 90–110 BPM.' },
    baroque: { engine: 'riff', style: 'baroque', sliders: { length: 0.55, density: 0.45 }, tip: 'Continuo: vandrande basstämma, cello eller orgelpedal. Fungerar fint under en fuga-lead.' },
    jazz:    { engine: 'walking', sliders: { density: 0.40 }, tip: 'Walking bass: rot på 1:an, kromatisk approach in i varje nytt ackord. Swinga 8:orna i din DAW. Kontrabas/fingerbas.' },
    synth:   { engine: 'riff', style: 'acid', acid: true, sliders: { density: 0.65, length: 0.35 }, tip: '303-acid: överlappande noter = glide på TB-303-synthar (sätt mono+glide). Accenterna gör resten. 125–140 BPM.' },
    lofi:    { engine: 'riff', style: 'pulse', sliders: { density: 0.25, length: 0.70 }, tip: 'Half-time sub-bas, få toner, låt den gunga. Sinus eller mjuk saw. 70–90 BPM.' },
    minimal: { engine: 'riff', style: 'pulse', sliders: { density: 0.30, variation: 0.10 }, tip: 'Pulserande rot-bas — hypnotisk repetition. Sidechain mot kicken. 120–130 BPM.' },
  },
  lead: {
    french:  { engine: 'riff', style: 'dance', tip: 'Funkig filtered lead à la D.A.N.C.E. Phaser + lowpass-automation. 110–125 BPM.' },
    disco:   { engine: 'riff', style: 'cosmic', sliders: { variation: 0.45 }, tip: 'Cosmic disco-lead à la Todd Terje — arpeggio-aktig, lekfull. Analog poly-synth. 105–120 BPM.' },
    rock:    { engine: 'riff', style: 'rock', sliders: { register: 0.35, chromatic: 0.05 }, tip: 'Pentatoniskt gitarriff. Mollpentatonisk skala rekommenderas. Lägg stämma "Oktav ned" för power.' },
    reggae:  { engine: 'riff', style: 'reggae', sliders: { density: 0.35, syncopation: 0.60 }, tip: 'Melodica/orgel-lead med luft — tänk Augustus Pablo. 70–90 BPM.' },
    latin:   { engine: 'riff', style: 'latin', sliders: { density: 0.65, syncopation: 0.60, length: 0.35 }, tip: 'Montuno-piano: synkoperat arpeggio-mönster. Dubbla i oktaver (stämma "Oktav upp", samtidig). 90–110 BPM.' },
    baroque: { engine: 'riff', style: 'baroque', sliders: { density: 0.55, length: 0.70, chromatic: 0.15 }, tip: 'Fuga-subjekt: lägg "Kvint upp diatoniskt / 1 takt senare" + "Oktav upp / 2 takter senare" för exposition. Orgel/cembalo.' },
    jazz:    { engine: 'riff', style: 'dance', sliders: { chromatic: 0.30, syncopation: 0.55, length: 0.40 }, tip: 'Bluesig lead — testa blues- eller dorisk skala. Rhodes eller gitarr. Swinga 8:orna.' },
    synth:   { engine: 'riff', style: 'phantom', sliders: { density: 0.85, length: 0.30, chromatic: 0.40 }, tip: 'Snabb kromatisk synth-lead à la Justice "Phantom". Hård saw + unison. 120–130 BPM.' },
    lofi:    { engine: 'riff', style: 'ambient', sliders: { density: 0.30, length: 0.70, variation: 0.45 }, tip: 'Mjuk lead över lo-fi-komp — Rhodes/gitarr med tape-vibb. 70–85 BPM.' },
    minimal: { engine: 'berlin', sliders: { density: 0.60, variation: 0.25, length: 0.25, register: 0.45 }, tip: 'Berlin school-sekvens: exakt repetition med små mutationer var 4:e takt. Analog mono-synth + delay. Tangerine Dream / melodisk techno.' },
  },
  melody: {
    french:  { engine: 'vocal', style: 'anthem', tip: 'Sångbar hook över house-komp. Stegvis rörelse, gap-fill efter språng. Skriv text på den!' },
    disco:   { engine: 'vocal', style: 'anthem', sliders: { syncopation: 0.30 }, tip: 'Disco-refräng — sjungbar, lite synkop. Strings unisont gör den episk. 110–122 BPM.' },
    rock:    { engine: 'vocal', style: 'rock', sliders: { density: 0.30 }, tip: 'Rocksång — pentatonisk, råare. Testa mollpentatonisk skala.' },
    reggae:  { engine: 'vocal', style: 'reggae', sliders: { syncopation: 0.40 }, tip: 'Laidback vokalmelodi med off-beat-frasering. 70–90 BPM.' },
    latin:   { engine: 'vocal', style: 'latin', sliders: { density: 0.35, syncopation: 0.45 }, tip: 'Son/salsa-melodi — synkoperad men sångbar. Clave i ryggen.' },
    baroque: { engine: 'vocal', style: 'baroque', sliders: { density: 0.35, length: 0.90 }, tip: 'Aria-linje: stegvis, lång frasering. Vacker på stråk eller oboe-patch.' },
    jazz:    { engine: 'vocal', style: 'anthem', sliders: { chromatic: 0.15, syncopation: 0.35 }, tip: 'Standards-melodi med kromatiska färgtoner. Swinga frasering i DAW:n.' },
    synth:   { engine: 'vocal', style: 'italo', sliders: { density: 0.30, length: 0.75 }, tip: 'Synthpop-topline à la 80-tal — sångbar över italo-arp. 110–125 BPM.' },
    lofi:    { engine: 'vocal', style: 'ambient', sliders: { density: 0.18, length: 0.95 }, tip: 'Drömsk, gles melodi — få toner, mycket rymd. Mjuk sinus-lead eller humming.' },
    minimal: { engine: 'vocal', style: 'pulse', sliders: { density: 0.20, variation: 0.30 }, tip: 'Minimal hook — två-tre toner som etsar sig fast. Mindre är mer.' },
  },
  chord: {
    french:  { engine: 'riff', style: 'filter', voicing: 'wide', extensions: 'seven', tip: 'House-piano: m7-stabs, sidechain mot kick. Daft Punk-skolan. 118–126 BPM.' },
    disco:   { engine: 'riff', style: 'dance', voicing: 'spread', extensions: 'seven', sliders: { syncopation: 0.50 }, tip: 'Disco-stabs: 7:or på off-beats. Strings eller clavinet. 110–122 BPM.' },
    rock:    { engine: 'riff', style: 'rock', voicing: 'compact', extensions: 'none', sliders: { length: 0.30, syncopation: 0.25 }, tip: 'Power-stabs — råa treklanger. Distad gitarr eller orgel.' },
    reggae:  { engine: 'riff', style: 'reggae', voicing: 'compact', extensions: 'none', sliders: { density: 0.25, syncopation: 0.90, length: 0.15, register: 0.60 }, tip: 'Skank: torra stabs på off-beats. Gitarr/orgel, kort och tight. Para med Reggae-bas. 70–90 BPM.' },
    latin:   { engine: 'riff', style: 'latin', voicing: 'compact', extensions: 'seven', sliders: { syncopation: 0.60 }, tip: 'Montuno-komp med 7:or, synkoperat mot clave. Piano. 90–110 BPM.' },
    baroque: { engine: 'riff', style: 'baroque', voicing: 'compact', extensions: 'none', sliders: { length: 0.50, syncopation: 0.15 }, tip: 'Cembalo-block — continuo-realisering. Funkar även på pluck-synth.' },
    jazz:    { engine: 'riff', style: 'anthem', voicing: 'wide', extensions: 'thirteenth', sliders: { density: 0.30, length: 0.70, variation: 0.50 }, tip: 'Neo-soul: m13/maj13 utspritt över två oktaver. Rhodes med chorus. D\'Angelo/Glasper. 75–95 BPM.' },
    synth:   { engine: 'riff', style: 'filter', voicing: 'spread', extensions: 'sus4', sliders: { density: 0.75, length: 0.12 }, tip: 'Trance gate: täta sus4-stabs, kör genom gate/sidechain. Supersaw. 132–142 BPM.' },
    lofi:    { engine: 'riff', style: 'ambient', voicing: 'compact', extensions: 'ninth', sliders: { density: 0.18, length: 0.85 }, tip: 'Lo-fi keys: m9 i långsamt tempo, tape-wobble + vinylknaster. 70–85 BPM.' },
    minimal: { engine: 'riff', style: 'pulse', voicing: 'compact', extensions: 'sus2', sliders: { density: 0.25, length: 0.50 }, tip: 'Glesa sus2-stabs — öppet, svävande. Mycket reverb, mycket tålamod.' },
  },
  arp: {
    french:  { engine: 'arp', pattern: 'updown', sliders: { density: 0.60 }, tip: 'Upp-och-ner-arp i 16-delar. Filtersvep + sidechain. 118–126 BPM.' },
    disco:   { engine: 'arp', pattern: 'up', sliders: { density: 0.30, length: 0.45 }, tip: 'Stigande 8-dels-arp — strings eller analog synth. Giorgio Moroder-skolan. 110–122 BPM.' },
    rock:    { engine: 'arp', pattern: 'up', sliders: { density: 0.30, register: 0.35, range: 0.30, length: 0.60 }, tip: 'Brutna ackord på gitarr — fingerspel/clean. Ballad-läge.' },
    reggae:  { engine: 'arp', pattern: 'up', sliders: { density: 0.30, syncopation: 0.70 }, tip: 'Off-beat-arp: spelar bara på off-beats, som en arpeggierad skank.' },
    latin:   { engine: 'arp', pattern: 'updown', sliders: { density: 0.60, syncopation: 0.30 }, tip: 'Montuno-arp i 16-delar — piano eller marimba. 90–110 BPM.' },
    baroque: { engine: 'arp', pattern: 'alberti', sliders: { density: 0.60, length: 0.50 }, tip: 'Alberti-bas / brutna ackord à la Bach-preludium. Cembalo, piano eller pluck. Tidlös.' },
    jazz:    { engine: 'arp', pattern: 'updown', sliders: { density: 0.30, length: 0.55 }, tip: 'Brutna ackord i 8-delar — komp bakom melodi. Lägg 7:or via ackordföljden (Am7, Dm7...).' },
    synth:   { engine: 'arp', pattern: 'up', sliders: { density: 0.80, range: 0.70, length: 0.20 }, tip: 'Trance-arp: 16-delar över 2 oktaver. Supersaw + 3/16-delay + sidechain. 132–142 BPM.' },
    lofi:    { engine: 'arp', pattern: 'down', sliders: { density: 0.30, length: 0.70, variation: 0.30 }, tip: 'Fallande, mjuk arp — harpa/kalimba-känsla över lo-fi-beat.' },
    minimal: { engine: 'arp', pattern: 'octave', sliders: { density: 0.60, register: 0.45 }, tip: 'Oktav-puls i mellanregister — hypnotisk motor. Plucky mono-synth. 120–130 BPM.' },
  },
  drums: {
    french:  { engine: 'drums', drumStyle: 'house', tip: 'House: kick 4x4, clap på 2 & 4, off-beat hats. 120–128 BPM.' },
    disco:   { engine: 'drums', drumStyle: 'disco', tip: 'Disco: open hat på varje off-beat ("pea soup") + tamburin. 110–122 BPM.' },
    rock:    { engine: 'drums', drumStyle: 'rock', sliders: { variation: 0.40 }, tip: 'Rakt rock-komp: kick 1 & 3, virvel 2 & 4. Höj Variation för fler fills.' },
    reggae:  { engine: 'drums', drumStyle: 'onedrop', tip: 'One drop: tyngdpunkten på 3:an (kick + rim ihop), luft på 1:an. 70–90 BPM.' },
    latin:   { engine: 'drums', drumStyle: 'latin', sliders: { density: 0.60, syncopation: 0.40 }, tip: '3-2 son-clave, congas, cowbell. Lägg ovanpå valfritt komp. 90–115 BPM.' },
    baroque: { engine: 'drums', drumStyle: 'rock', sliders: { density: 0.35, variation: 0.50 }, tip: 'Barock har inga trummor — det här är ett anakronistiskt rock-komp. Kör tom-fills som pukor, eller skippa.' },
    jazz:    { engine: 'drums', drumStyle: 'funkbreak', sliders: { density: 0.55, variation: 0.45 }, tip: 'Ghost notes + synkop — närmast swing appen kommer. Swinga 8:orna i DAW:n och lägg ride ovanpå.' },
    synth:   { engine: 'drums', drumStyle: 'techno', sliders: { density: 0.55, syncopation: 0.30 }, tip: 'Maskinell 16-dels-hihat, hård kick. 125–140 BPM.' },
    lofi:    { engine: 'drums', drumStyle: 'lofi', tip: 'Lat boom bap: sloppy kick, avslappnad virvel. Lägg swing + vinylknaster. 70–90 BPM.' },
    minimal: { engine: 'drums', drumStyle: 'techno', sliders: { density: 0.35, variation: 0.15 }, tip: 'Avskalad techno — få element, mycket repetition. 122–132 BPM.' },
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
  role: 'bass',          // UI-roll: bass | lead | melody | chord | arp | drums
  genre: 'french',
  engine: 'riff',        // riff | vocal | arp | walking | berlin | drums
  style: 'genesis',      // corpus-DNA för riff/vocal-motorerna
  pattern: 'up',         // arp-mönster
  acid: false,           // 303-slides på/av
  voicing: 'compact',
  extensions: 'none',
  drumStyle: null,
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
  bindChips();
  bindVoiceUI();
  bindActions();
  applyCombo('bass', 'french', { audition: false });
  generate();
});

function buildSliders() {
  const root = document.getElementById('sliders');
  root.innerHTML = '';
  for (const def of SLIDER_DEFS) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    wrap.dataset.control = def.id;
    wrap.innerHTML = `
      <span class="control-label">${def.label}</span>
      <div class="segs" role="radiogroup" aria-label="${def.label}">
        ${def.levels.map((lv, i) => `<button type="button" class="seg" data-id="${def.id}" data-step="${i}">${lv}</button>`).join('')}
      </div>
    `;
    root.appendChild(wrap);
  }
  root.addEventListener('click', e => {
    const btn = e.target.closest('.seg');
    if (!btn) return;
    STATE.sliders[btn.dataset.id] = (+btn.dataset.step) / 4;
    refreshSliderUI();
  });
  refreshSliderUI();
}

function refreshSliderUI() {
  for (const def of SLIDER_DEFS) {
    const active = Math.round((STATE.sliders[def.id] ?? 0) * 4);
    document.querySelectorAll(`.seg[data-id="${def.id}"]`).forEach((btn, i) => {
      btn.classList.toggle('active', i === active);
    });
  }
}

// ---------- ROLL × GENRE CHIPS ----------
function bindChips() {
  const roleRow = document.getElementById('role-chips');
  const genreRow = document.getElementById('genre-chips');
  roleRow.innerHTML = ROLES.map(r =>
    `<button type="button" class="chip" data-role="${r.id}">${r.label}</button>`).join('');
  genreRow.innerHTML = GENRES.map(g =>
    `<button type="button" class="chip" data-genre="${g.id}">${g.label}</button>`).join('');

  roleRow.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (btn) applyCombo(btn.dataset.role, STATE.genre, { audition: true });
  });
  genreRow.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (btn) applyCombo(STATE.role, btn.dataset.genre, { audition: true });
  });

  const extSel = document.getElementById('extensions-select');
  if (extSel) {
    extSel.innerHTML = EXTENSION_OPTIONS
      .map(o => `<option value="${o.value}">${o.label}</option>`)
      .join('');
    extSel.addEventListener('change', e => { STATE.extensions = e.target.value; });
  }
}

// Resolve (role, genre) → recipe, apply it, and optionally audition directly.
function applyCombo(roleId, genreId, { audition = false } = {}) {
  const recipe = RECIPES[roleId]?.[genreId];
  if (!recipe) return;

  STATE.role = roleId;
  STATE.genre = genreId;
  STATE.engine = recipe.engine;
  STATE.style = recipe.style ?? STATE.style;
  STATE.pattern = recipe.pattern ?? 'up';
  STATE.acid = !!recipe.acid;
  STATE.voicing = recipe.voicing ?? 'compact';
  STATE.extensions = recipe.extensions ?? 'none';
  STATE.drumStyle = recipe.drumStyle ?? null;

  const base = ROLE_BASE[roleId];
  for (const def of SLIDER_DEFS) {
    STATE.sliders[def.id] = recipe.sliders?.[def.id] ?? base[def.id];
  }

  document.querySelectorAll('#role-chips .chip').forEach(b =>
    b.classList.toggle('active', b.dataset.role === roleId));
  document.querySelectorAll('#genre-chips .chip').forEach(b =>
    b.classList.toggle('active', b.dataset.genre === genreId));

  const tipEl = document.getElementById('preset-tip');
  if (tipEl) tipEl.textContent = recipe.tip ?? '';

  refreshExtensionsUI();
  refreshPanelVisibility();
  refreshSliderUI();

  if (audition) {
    generate();
    play();   // chip-klicket är en user-gesture, så ljudet får starta
  }
}

function comboLabel() {
  const r = ROLES.find(x => x.id === STATE.role)?.label ?? STATE.role;
  const g = GENRES.find(x => x.id === STATE.genre)?.label ?? STATE.genre;
  return `${g} · ${r}`;
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

  // Pitch-related controls are meaningless for drums.
  for (const id of DRUM_HIDDEN_SLIDERS) {
    const ctrl = document.querySelector(`[data-control="${id}"]`);
    if (ctrl) ctrl.style.display = isDrums ? 'none' : '';
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
  // Keep the collapsed-summary counter in sync, and pop the panel open when
  // voices exist so active settings are never hidden.
  const counter = document.getElementById('voice-count');
  if (counter) counter.textContent = STATE.voices.length ? `${STATE.voices.length} aktiva` : '';
  const panel = document.getElementById('panel-voices');
  if (panel && STATE.voices.length > 0) panel.open = true;
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

  // Random combo, then nudge sliders (snapped to quarter steps for the UI).
  const role = ROLES[Math.floor(Math.random() * ROLES.length)].id;
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)].id;
  applyCombo(role, genre, { audition: false });
  for (const def of SLIDER_DEFS) {
    const nudge = (Math.random() - 0.5) * 0.3;
    STATE.sliders[def.id] = Math.round(Math.max(0, Math.min(1, STATE.sliders[def.id] + nudge)) * 4) / 4;
  }
  refreshSliderUI();

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

  if (STATE.engine === 'drums') {
    const result = generateDrums({
      drumStyle: STATE.drumStyle,
      bars: ui.bars,
      sliders: STATE.sliders,
      seed,
    });
    STATE.currentResult = { main: result, voices: [], bars: ui.bars, bpm: ui.bpm, isDrums: true };
    document.getElementById('seed-display').textContent =
      `seed: ${seed.toString(16).padStart(8, '0')}   ·   ${ui.bars} takter @ ${ui.bpm} bpm   ·   ${comboLabel()}`;
    renderPianoRoll();
    return;
  }

  // Dispatch to the right engine. All engines return the same result shape,
  // so harmony voices, the piano roll and MIDI export work on every one.
  const common = {
    tonicMidi: ui.tonicMidi,
    scaleIntervals: ui.scaleIntervals,
    bars: ui.bars,
    chordProgression: ui.chordProgression,
    sliders: STATE.sliders,
    seed,
  };
  let result;
  if (STATE.engine === 'arp') {
    result = generateArp({ ...common, pattern: STATE.pattern });
  } else if (STATE.engine === 'walking') {
    result = generateWalkingBass(common);
  } else if (STATE.engine === 'berlin') {
    result = generateBerlin(common);
  } else {
    // 'riff' & 'vocal' — Markov-based engine; vocal adds singability bias.
    const genRole = STATE.engine === 'vocal' ? 'vocal'
                  : STATE.role === 'bass' ? 'bass'
                  : STATE.role === 'chord' ? 'chord'
                  : 'lead';
    result = generateRiff({
      ...common,
      bpm: ui.bpm,
      style: STATE.style,
      role: genRole,
      voicing: STATE.voicing,
      extensions: STATE.extensions,
    });
    if (STATE.acid) {
      applyAcidSlides(result, 0.45 + (STATE.sliders.syncopation ?? 0.3) * 0.4, mulberry32(seed ^ 0x5EED));
    }
  }

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

  document.getElementById('seed-display').textContent =
    `seed: ${seed.toString(16).padStart(8, '0')}   ·   ${ui.rootName} ${ui.scaleName}   ·   ${ui.bars} takter @ ${ui.bpm} bpm   ·   ${comboLabel()}`;

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
    filename = `riff_${ui.rootName.replace('#', 's')}_${ui.scaleName}_${STATE.genre}_${STATE.role}_${seedHex}.mid`;
  }

  const bytes = writeMidi({ bpm, tracks });
  downloadMidi(bytes, filename);
}
