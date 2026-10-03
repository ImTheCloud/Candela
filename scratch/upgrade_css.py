import re
import os

path = '/Users/claudiupopadiuc/Documents/GitHub/Candela/src/app.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Fonts
html = html.replace(
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gloock&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&family=Onest:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&family=IBM+Plex+Mono:wght@500&display=swap">'
)

# 2. Update CSS Variables
old_vars = """  --bg:#F8F1E6;          /* warm cream */
  --surface:#FFFBF4;
  --surface-2:#F1E6D5;
  --ink:#3A271B;         /* dark brown */
  --ink-2:#7B6450;
  --line:#E7D8C2;
  --oil:#D97B26;         /* lamp oil / flame orange */
  --oil-soft:#FBE5CC;
  --oil-ink:#8A4510;
  --cedar:#8A5A36;       /* warm brown (easy level, avatars) */
  --cedar-soft:#F2E3D2;
  --ok:#5E8A3A; --ok-soft:#E8F0DA;
  --warn:#D99C26; --warn-soft:#FCF0D2;
  --bad:#B23A2E; --bad-soft:#FBE4DF;
  --p1:#D97B26; --p2:#8A5A36; --p3:#B0644A; --p4:#5E8A3A; --p5:#B4534A;
  --shadow:0 1px 2px rgb(58 39 27 / .05), 0 10px 30px -18px rgb(58 39 27 / .28);
  --f-display:"Gloock", "Georgia", "Times New Roman", serif;
  --f-bible:"Source Serif 4", "Georgia", "Times New Roman", serif;
  --f-body:"Onest", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;"""

new_vars = """  --bg:#F7F9FC;
  --surface:#FFFFFF;
  --surface-2:#EDF2F7;
  --ink:#1A202C;
  --ink-2:#718096;
  --line:#E2E8F0;
  --oil:#F59E0B; /* Vibrant Amber */
  --oil-soft:#FEF3C7;
  --oil-ink:#B45309;
  --cedar:#8B5CF6; /* Vibrant Purple */
  --cedar-soft:#EDE9FE;
  --ok:#58CC02; /* Duolingo Green */
  --ok-soft:#D7FFB8;
  --warn:#FFC800;
  --warn-soft:#FFF4CE;
  --bad:#FF4B4B; /* Duolingo Red */
  --bad-soft:#FFDFDF;
  --p1:#F59E0B; --p2:#8B5CF6; --p3:#EC4899; --p4:#58CC02; --p5:#FF4B4B;
  --shadow:0 4px 12px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.05);
  --f-display:"Outfit", system-ui, sans-serif;
  --f-bible:"Source Serif 4", "Georgia", "Times New Roman", serif;
  --f-body:"Outfit", system-ui, sans-serif;"""

html = html.replace(old_vars, new_vars)

# 3. Add 3D Button styles
html = html.replace(
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;padding:14px 22px;font-weight:600;font-size:16px;transition:transform .15s ease, background .2s, box-shadow .2s;min-height:50px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:2px solid transparent;border-radius:16px;padding:14px 22px;font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:0.04em;transition:all .15s ease;min-height:50px}'
)
html = html.replace(
    '.btn:active{transform:scale(.97)}',
    '.btn:active:not(:disabled){transform:translateY(4px);box-shadow:0 0px 0 transparent !important;}'
)
html = html.replace(
    '.btn-primary{background:var(--ink);color:var(--bg)}',
    '.btn-primary{background:var(--ink);color:var(--bg);box-shadow:0 4px 0 var(--ink-2)}'
)
html = html.replace(
    '.btn-primary:hover{box-shadow:0 6px 18px -8px var(--ink)}',
    '@media (hover: hover) and (pointer: fine){.btn-primary:hover{filter:brightness(1.1)}}'
)
html = html.replace(
    '.btn-oil{background:var(--oil);color:#2a1505}',
    '.btn-oil{background:var(--oil);color:#fff;box-shadow:0 4px 0 var(--oil-ink)}'
)

# 4. Enhance quiz options (3D cards)
html = html.replace(
    '.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--bg);border-radius:var(--r);padding:13px 14px;font-size:16px;line-height:1.35;transition:border-color .15s, background .15s, transform .15s}',
    '.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:2px solid var(--line);border-bottom-width:4px;background:var(--bg);border-radius:var(--r);padding:13px 14px;font-size:16px;line-height:1.35;font-weight:600;transition:all .15s}'
)
html = html.replace(
    '.opt:active:not(:disabled){transform:scale(.985)}',
    '.opt:active:not(:disabled){transform:translateY(2px);border-bottom-width:2px;margin-top:2px;margin-bottom:-2px}'
)
html = html.replace(
    '.opt.opt-one[aria-pressed="true"]{border-color:var(--ink);background:var(--surface)}',
    '.opt.opt-one[aria-pressed="true"]{border-color:var(--oil);background:var(--oil-soft);color:var(--oil-ink)}'
)

# 5. Make qcard have nicer shadow
html = html.replace(
    '.qcard{background:var(--surface);border-radius:22px;padding:22px 20px;box-shadow:var(--shadow);display:grid;gap:18px}',
    '.qcard{background:var(--surface);border-radius:24px;border:2px solid var(--line);padding:24px 20px;box-shadow:var(--shadow);display:grid;gap:18px}'
)

# 6. Fix iOS Hover everywhere by adding @media (hover: hover) if it doesn't exist
# We will use regex to find :hover that is NOT already inside @media
# Since it's a bit tricky with simple string replace, let's just do targeted replacements.

hover_targets = [
    ('.resume-btn:hover{opacity:.9}', '@media(hover:hover) and (pointer:fine){.resume-btn:hover{opacity:.9}}'),
    ('.resume-close:hover{color:var(--bad);background:var(--bad-soft)}', '@media(hover:hover) and (pointer:fine){.resume-close:hover{color:var(--bad);background:var(--bad-soft)}}'),
    ('.mopt:hover{border-color:var(--ink-2)}', '@media(hover:hover) and (pointer:fine){.mopt:hover{border-color:var(--ink-2)}}'),
    ('.pop-close:hover{color:var(--ink);background:var(--line)}', '@media(hover:hover) and (pointer:fine){.pop-close:hover{color:var(--ink);background:var(--line)}}'),
    ('.pw-eye:hover{color:var(--ink)}', '@media(hover:hover) and (pointer:fine){.pw-eye:hover{color:var(--ink)}}'),
    ('.fam:hover{border-color:var(--ink-2)}', '@media(hover:hover) and (pointer:fine){.fam:hover{border-color:var(--ink-2)}}'),
    ('.read-btn:hover{border-color:var(--ink-2)}', '@media(hover:hover) and (pointer:fine){.read-btn:hover{border-color:var(--ink-2)}}'),
    ('.verse-expander-btn:hover,.verse-expander-btn:focus,.verse-expander-btn:active{background:transparent!important;outline:none!important;color:var(--ink)}', '@media(hover:hover) and (pointer:fine){.verse-expander-btn:hover{background:transparent!important;outline:none!important;color:var(--ink)}} .verse-expander-btn:active{color:var(--ink)}'),
]
for old, new in hover_targets:
    html = html.replace(old, new)


# 7. Add glassmorphism to qactions on mobile
qactions_old = '.qactions{position:fixed;left:0;right:0;bottom:0;z-index:10;margin:0 auto;max-width:640px;width:100%;box-sizing:border-box;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));background:linear-gradient(to top,var(--bg) 80%,transparent)}'
qactions_new = '.qactions{position:fixed;left:0;right:0;bottom:0;z-index:10;margin:0 auto;max-width:640px;width:100%;box-sizing:border-box;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb, var(--bg) 85%, transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line);}'
html = html.replace(qactions_old, qactions_new)

# 8. Dark mode variables
dark_mode = """
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0F172A;
    --surface: #1E293B;
    --surface-2: #334155;
    --ink: #F8FAFC;
    --ink-2: #94A3B8;
    --line: #334155;
    --oil: #F59E0B;
    --oil-soft: rgba(245, 158, 11, 0.2);
    --oil-ink: #FDE68A;
    --cedar: #8B5CF6;
    --cedar-soft: rgba(139, 92, 246, 0.2);
    --ok: #58CC02;
    --ok-soft: rgba(88, 204, 2, 0.15);
    --warn: #FFC800;
    --warn-soft: rgba(255, 200, 0, 0.15);
    --bad: #FF4B4B;
    --bad-soft: rgba(255, 75, 75, 0.15);
    --shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
}
"""
if "prefers-color-scheme: dark" not in html:
    html = html.replace('color-scheme:light;\n}', 'color-scheme:light dark;\n}\n' + dark_mode)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print("CSS Upgrade Complete.")
