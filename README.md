# riffgen.

Musikalisk MIDI-generator i webbläsaren — single-note-riff, basgångar, melodier,
ackord-riff, fugor och trummor. Allt genereras lokalt, ingen server behövs.

**33 stilar** i 7 kategorier: Bas, Lead, Arp, Ackord-riff, Melodi, Polyfoni, Trummor.
Exporterar standard-MIDI (.mid) som importeras direkt i Ableton, Logic, FL Studio m.fl.
Trummor exporteras på kanal 10 enligt General MIDI.

## Kör lokalt

Öppna `riffgen.html` direkt i webbläsaren (allt-i-en-fil), eller servera mappen:

```bash
python3 -m http.server 8765
# → http://localhost:8765
```

## Publicera på GitHub Pages (engångs-setup)

1. Skapa ett gratis konto på [github.com](https://github.com) (om du inte har ett).
2. Skapa ett nytt **publikt** repo, t.ex. `riffgen`: <https://github.com/new>
3. Koppla och pusha (byt `DITTNAMN` mot ditt användarnamn):

   ```bash
   cd midi-riff-gen
   git remote add origin https://github.com/DITTNAMN/riffgen.git
   git push -u origin main
   ```

4. Aktivera Pages: repo → **Settings → Pages** → Source: *Deploy from a branch*
   → Branch: `main`, mapp `/ (root)` → **Save**.
5. Efter ~1 minut ligger appen på `https://DITTNAMN.github.io/riffgen/`
   — dela länken med vänner.

## Uppdatera den publicerade versionen

```bash
./deploy.sh "vad du ändrade"
```

Scriptet bygger om `riffgen.html`, committar allt och pushar — vännerna får
automatiskt senaste versionen på samma URL.

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
