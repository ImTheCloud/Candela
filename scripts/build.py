#!/usr/bin/env python3
"""Build index.html from src/app.html + content/<book>/. Usage: python3 scripts/build.py"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Public client settings (the publishable key is meant to ship in the page; data is protected by row-level security).
SUPABASE = {'url': 'https://hpmypeoszocxjjxrnbfh.supabase.co', 'key': 'sb_publishable_MtSGXf-G2iNiIdP0JqSm2Q_gMH_flwg'}
BOOK = os.path.join(ROOT, 'content', '1-samuel')

quiz = {}
for p in sorted(glob.glob(os.path.join(BOOK, 'intrebari', 'ch*.json'))):
    d = json.load(open(p))
    quiz[d['ch']] = {'easy': d['easy'], 'hard': d['hard']}
text = {int(k): v for k, v in json.load(open(os.path.join(BOOK, 'text-cornilescu.json'))).items()}
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

s = open(os.path.join(ROOT, 'src', 'app.html')).read()
s = s.replace('/*__QUIZ__*/{}', dump(quiz)).replace('/*__TEXT__*/{}', dump(text)).replace('/*__SB__*/null', json.dumps(SUPABASE))
fav = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2c2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1.5-3.5 2-5 .5 1.5 1.2 2.2 2 2.5C11.6 5.5 12 4 12 2z' fill='%23B87A0B'/%3E"
       "%3Cpath d='M3 16c3 0 6-1.5 9-1.5s5 .8 9 0c-.7 3-4 5.5-9 5.5-3.5 0-7-1.5-9-4z' fill='%231E261D'/%3E%3C/svg%3E")
n = sum(len(v['easy']) + len(v['hard']) for v in quiz.values())
n_ro = f'{n:,}'.replace(',', '.')
head = ('<!doctype html><html lang="ro"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#F8F1E6" media="(prefers-color-scheme: light)">'
        '<meta name="theme-color" content="#F8F1E6" media="(prefers-color-scheme: dark)">'
        f'<link rel="icon" href="{fav}">'
        '<meta property="og:title" content="Candela · Test biblic 1 Samuel">'
        f'<meta property="og:description" content="{n_ro} de întrebări din 1 Samuel (Cornilescu), nivel ușor și greu.">'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
        '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script></head><body>')
# Question counts per chapter must match public.quiz_counts in Supabase (used to validate mastered question ids).
rows = ','.join(f"({c},{len(v['easy'])},{len(v['hard'])})" for c, v in sorted(quiz.items()))
open(os.path.join(ROOT, 'supabase', 'quiz_counts.sql'), 'w').write(
    'insert into public.quiz_counts (ch, e, h) values ' + rows + '\n  on conflict (ch) do update set e = excluded.e, h = excluded.h;\n')
open(os.path.join(ROOT, 'index.html'), 'w').write(head + s + '</body></html>')
print(f'index.html: {len(quiz)} chapters, {n} questions')
