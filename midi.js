// MIDI Standard MIDI File (SMF) Type 1 writer.
// Pure-JS, no dependencies. Produces a Blob suitable for download.

const PPQ = 480; // ticks per quarter

function vlq(n) {
  // Variable-length quantity encoding (big-endian, MSB-first, continuation bit on all but last).
  if (n < 0) n = 0;
  const out = [n & 0x7F];
  n >>= 7;
  while (n > 0) {
    out.unshift((n & 0x7F) | 0x80);
    n >>= 7;
  }
  return out;
}

function u16be(n) { return [(n >> 8) & 0xFF, n & 0xFF]; }
function u24be(n) { return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF]; }
function u32be(n) { return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF]; }

function chunk(name, dataBytes) {
  const header = [];
  for (let i = 0; i < 4; i++) header.push(name.charCodeAt(i));
  return [...header, ...u32be(dataBytes.length), ...dataBytes];
}

// notes: [{ pitch: midi, startTicks: int, durationTicks: int, velocity: 1-127, channel: 0-15 }]
// Returns an array of event bytes for one MTrk (excluding header & end-of-track meta).
function buildTrackEvents(notes, opts = {}) {
  const events = [];
  // Track name (meta)
  if (opts.name) {
    const nameBytes = [...new TextEncoder().encode(opts.name)];
    events.push({ tick: 0, order: 0, bytes: [0xFF, 0x03, ...vlq(nameBytes.length), ...nameBytes] });
  }
  // Program change (instrument)
  if (opts.program != null) {
    const ch = opts.channel ?? 0;
    events.push({ tick: 0, order: 1, bytes: [0xC0 | ch, opts.program & 0x7F] });
  }
  // Notes -> on/off events
  for (const n of notes) {
    const ch = n.channel ?? opts.channel ?? 0;
    const vel = Math.max(1, Math.min(127, n.velocity ?? 96));
    events.push({ tick: n.startTicks, order: 2, bytes: [0x90 | ch, n.pitch & 0x7F, vel] });
    events.push({ tick: n.startTicks + n.durationTicks, order: 3, bytes: [0x80 | ch, n.pitch & 0x7F, 64] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  // Convert to delta-time stream
  let lastTick = 0;
  const bytes = [];
  for (const e of events) {
    const delta = Math.max(0, e.tick - lastTick);
    bytes.push(...vlq(delta));
    bytes.push(...e.bytes);
    lastTick = e.tick;
  }
  // End of track
  bytes.push(...vlq(0), 0xFF, 0x2F, 0x00);
  return bytes;
}

// Conductor track: tempo + time signature at tick 0.
function buildConductorTrack(bpm, timeSig = [4, 4]) {
  const microsPerQuarter = Math.round(60_000_000 / bpm);
  const [num, denom] = timeSig;
  const denomPow = Math.round(Math.log2(denom));
  const bytes = [];
  // Time signature: FF 58 04 nn dd cc bb (cc=clocks/click, bb=32nd per quarter)
  bytes.push(...vlq(0), 0xFF, 0x58, 0x04, num, denomPow, 0x18, 0x08);
  // Tempo: FF 51 03 tt tt tt
  bytes.push(...vlq(0), 0xFF, 0x51, 0x03, ...u24be(microsPerQuarter));
  // End of track
  bytes.push(...vlq(0), 0xFF, 0x2F, 0x00);
  return bytes;
}

// tracks: [{ name, channel, program, notes: [...] }]
function writeMidi({ bpm = 120, timeSig = [4, 4], tracks = [] }) {
  const headerData = [...u16be(1), ...u16be(tracks.length + 1), ...u16be(PPQ)];
  const headerChunk = chunk('MThd', headerData);

  const conductor = chunk('MTrk', buildConductorTrack(bpm, timeSig));
  const trackChunks = [];
  for (const t of tracks) {
    const body = buildTrackEvents(t.notes, { name: t.name, channel: t.channel, program: t.program });
    trackChunks.push(...chunk('MTrk', body));
  }

  const all = [...headerChunk, ...conductor, ...trackChunks];
  return new Uint8Array(all);
}

function downloadMidi(bytes, filename) {
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
