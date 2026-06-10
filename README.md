# MidiGen

Musical MIDI generator in the browser — riffs, basslines, melodies, chord
stabs, fugues and drums. Everything is generated locally, no server needed.

Pick **what** you're writing (Bass, Lead, Melody, Chords, Arp, Drums) and a
**feel** (French house, Disco, Rock, Reggae, Latin, Baroque, Jazz/Soul,
Synth/Trance, Lo-fi, Minimal) — 60 combinations, each with its own engine and
sound-design tip. Exports standard MIDI (.mid) that imports directly into
Ableton, Logic, FL Studio and more. Drums export on channel 10 (General MIDI).

**Live:** <https://vnasman.github.io/MidiGen/>

## Run locally

Open `midigen.html` directly in a browser (all-in-one file), or serve the folder:

```bash
python3 -m http.server 8765
# → http://localhost:8765
```

## Update the published version

```bash
./deploy.sh "what you changed"
```

Rebuilds the bundle, commits and pushes — GitHub Pages updates within a minute.

## File structure

| File | Role |
|---|---|
| `index.html` | UI structure |
| `style.css` | Theme (light, violet accent) |
| `theory.js` | Scales + chord parser |
| `corpus.js` | Riff fragments, rhythm cells, drum patterns, phrase structures |
| `generator.js` | Engines: Markov riffs, vocal melodies, arpeggiator, walking bass, Berlin school, drums |
| `midi.js` | Standard MIDI File writer (no dependencies) |
| `app.js` | UI logic, Tone.js playback, piano roll |
| `build.py` | Bundles everything into `midigen.html` (one shareable file) |
| `deploy.sh` | Build + commit + push in one step |
