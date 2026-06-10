# riffgen.

Musikalisk MIDI-generator i webbläsaren — single-note-riff, basgångar, melodier,
ackord-riff, fugor och trummor. 

**33 stilar** i 7 kategorier: Bas, Lead, Arp, Ackord-riff, Melodi, Polyfoni, Trummor.
Exporterar standard-MIDI (.mid) som importeras direkt i Ableton, Logic, FL Studio m.fl.
Trummor exporteras på kanal 10 enligt General MIDI.

## Kör lokalt

Öppna `riffgen.html` direkt i webbläsaren (allt-i-en-fil), eller servera mappen:

```bash
python3 -m http.server 8765
# → http://localhost:8765
```

## Filstruktur

| Fil | Roll |
|---|---|
| `index.html` | UI-struktur |
| `style.css` | Tema (ljust, violett accent) |
| `theory.js` | Skalor + ackordparser |
| `corpus.js` | Riff-fragment, rytmceller, trummönster, frasstrukturer |
| `generator.js` | Riff-/trum-generering (Markov + mallar) |
| `midi.js` | Standard MIDI File-skrivare (inga beroenden) |
| `app.js` | UI-logik, Tone.js-uppspelning, pianorulle |
| `build.py` | Bundlar allt till `riffgen.html` (en delbar fil) |
| `deploy.sh` | Bygg + commit + push i ett steg |
