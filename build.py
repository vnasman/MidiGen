#!/usr/bin/env python3
"""Bundle MidiGen into a single self-contained midigen.html.

Inlines style.css and all local JS files. Tone.js is kept as a CDN link
(too large to inline practically). The result is one HTML file that you
can email / drop in a cloud folder / drag into a browser — no install,
no server required.
"""
from pathlib import Path
import re
import urllib.parse

ROOT = Path(__file__).parent

JS_ORDER = ['theory.js', 'midi.js', 'corpus.js', 'generator.js', 'app.js']
CSS_FILE = 'style.css'
INPUT = 'index.html'
OUTPUT = 'midigen.html'

def main():
    html = (ROOT / INPUT).read_text(encoding='utf-8')

    # Inline stylesheet.
    css = (ROOT / CSS_FILE).read_text(encoding='utf-8')
    html = re.sub(
        r'<link rel="stylesheet" href="style\.css">',
        f'<style>\n{css}\n</style>',
        html,
        count=1,
    )

    # Inline the SVG favicon as a data URI so the standalone file keeps its
    # tab icon; drop the PNG fallback links (they'd 404 when shared alone).
    svg = (ROOT / 'favicon.svg').read_text(encoding='utf-8')
    data_uri = 'data:image/svg+xml,' + urllib.parse.quote(svg.strip(), safe='')
    html = re.sub(
        r'<link rel="icon" href="favicon\.svg" type="image/svg\+xml">',
        f'<link rel="icon" href="{data_uri}" type="image/svg+xml">',
        html,
        count=1,
    )
    html = re.sub(r'\s*<link rel="icon" href="favicon-32\.png"[^>]*>', '', html)
    html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', '', html)

    # Strip local script tags (Tone.js stays as CDN).
    for f in JS_ORDER:
        html = re.sub(
            rf'\s*<script src="{re.escape(f)}"></script>',
            '',
            html,
        )

    # Concatenate all local JS and append before </body>.
    combined = '\n\n// ===== {0} =====\n\n'.join(['', *JS_ORDER]).strip()
    parts = []
    for f in JS_ORDER:
        parts.append(f'// ===== {f} =====')
        parts.append((ROOT / f).read_text(encoding='utf-8'))
    combined_js = '\n\n'.join(parts)

    html = html.replace(
        '</body>',
        f'<script>\n{combined_js}\n</script>\n</body>',
        1,
    )

    out = ROOT / OUTPUT
    out.write_text(html, encoding='utf-8')
    print(f'wrote {OUTPUT}  ({len(html.encode("utf-8")):,} bytes)')

if __name__ == '__main__':
    main()
