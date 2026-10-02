#!/usr/bin/env python3
"""Validate data/chNN.json question files. Usage: python3 validate.py 1 2 3  (or no args = all present)"""
import json, sys, os, re, unicodedata, glob

HERE = os.path.dirname(os.path.abspath(__file__))
TEXT = json.load(open(os.path.join(HERE, '..', 'content', '1-samuel', 'text-cornilescu.json')))

MAX_PER_LEVEL = 20

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9 ]+', ' ', s).split()

def parse_ref(ref, ch):
    m = re.fullmatch(r'(\d+):(\d+)(?:-(\d+))?', ref)
    if not m: return None
    c, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3) or m.group(2))
    return c, a, b

def check(ch):
    path = os.path.join(HERE, '..', 'content', '1-samuel', 'intrebari', f'ch{ch:02d}.json')
    errs, warns = [], []
    try:
        d = json.load(open(path))
    except Exception as e:
        return [f'cannot load: {e}'], [], {}
    nv = len(TEXT[str(ch)])
    seen = {}
    stats = {}
    if d.get('ch') != ch: errs.append('ch field mismatch')
    for mode in ('easy', 'hard'):
        qs = d.get(mode)
        if not isinstance(qs, list): errs.append(f'{mode} missing'); continue
        types = {}
        for i, q in enumerate(qs):
            tag = f'{mode}[{i}]'
            t = q.get('t'); types[t] = types.get(t, 0) + 1
            ref = q.get('ref', '')
            r = parse_ref(ref, ch)
            if not r: errs.append(f'{tag} bad ref {ref!r}'); continue
            c, a, b = r
            if c != ch or a < 1 or b > nv or b < a: errs.append(f'{tag} ref out of range {ref} (chapter has {nv} verses)')
            key = ' '.join(norm(q.get('q', '') + ' ' + json.dumps(q.get('pairs', q.get('opts', '')), ensure_ascii=False)))
            if key in seen: errs.append(f'{tag} duplicate of {seen[key]}')
            seen[key] = tag
            if not q.get('q'): errs.append(f'{tag} empty q')
            if t == 'tf':
                if not isinstance(q.get('a'), bool): errs.append(f'{tag} tf needs bool a')
            elif t == 'one':
                o = q.get('opts', [])
                if len(o) != 3 or not isinstance(q.get('a'), int) or not (0 <= q['a'] < len(o)): errs.append(f'{tag} one: exactly 3 opts and valid index a')
                if len(set(o)) != len(o): errs.append(f'{tag} duplicate opts')
            elif t == 'multi':
                o = q.get('opts', []); a_ = q.get('a')
                if len(o) != 3 or not isinstance(a_, list) or any((not isinstance(x, int)) or x < 0 or x >= len(o) for x in a_) or len(set(a_)) != len(a_):
                    errs.append(f'{tag} multi: exactly 3 opts and list a of valid indices (may be empty)')
                if len(set(o)) != len(o): errs.append(f'{tag} duplicate opts')
            elif t == 'match':
                p = q.get('pairs', [])
                if len(p) != 3 or any(len(x) != 2 for x in p): errs.append(f'{tag} match: exactly 3 pairs [left,right]')
                if len(set(x[1] for x in p)) != len(p) or len(set(x[0] for x in p)) != len(p): errs.append(f'{tag} match: lefts/rights must be unique')
            elif t == 'fill':
                ans = q.get('a')
                txt = q.get('q', '')
                if not isinstance(ans, list) or not ans: errs.append(f'{tag} fill needs list a'); continue
                if txt.count('___') != len(ans): errs.append(f'{tag} fill: blanks ___ count != answers'); continue
                full = txt
                for w in ans: full = full.replace('___', w, 1)
                verses = ' '.join(TEXT[str(ch)][a-1:b]) if r and c == ch and b <= nv else ''
                fn = ' '.join(norm(full)); vn = ' '.join(norm(verses))
                if fn not in vn: errs.append(f'{tag} fill text not found verbatim in {ref}: {full!r}')
            else:
                errs.append(f'{tag} unknown type {t}')
        if len(qs) > MAX_PER_LEVEL: warns.append(f'{mode}: {len(qs)} questions, keep at most {MAX_PER_LEVEL}')
        stats[mode] = (len(qs), types)
        for t in ('tf', 'one', 'multi', 'match', 'fill'):
            if types.get(t, 0) < 2: warns.append(f'{mode}: only {types.get(t,0)} of type {t}')
    # coverage
    covered = set()
    for mode in ('easy', 'hard'):
        for q in d.get(mode, []):
            r = parse_ref(q.get('ref', ''), ch)
            if r: covered.update(range(r[1], r[2] + 1))
    missing = [v for v in range(1, nv + 1) if v not in covered]
    if missing: warns.append(f'verses not referenced: {missing}')
    return errs, warns, stats

if __name__ == '__main__':
    chs = [int(x) for x in sys.argv[1:]] or sorted(int(re.findall(r'\d+', os.path.basename(p))[0]) for p in glob.glob(os.path.join(HERE, '..', 'content', '1-samuel', 'intrebari', 'ch*.json')))
    bad = 0
    for ch in chs:
        e, w, s = check(ch)
        print(f'== ch{ch}: ' + ', '.join(f'{m} {n} {t}' for m, (n, t) in s.items()))
        for x in e: print('  ERROR', x)
        for x in w: print('  warn ', x)
        bad += len(e)
    sys.exit(1 if bad else 0)
