#!/usr/bin/env python3
"""
Fix and improve 1 Samuel quiz questions:
1. Fix ch31 - last question has empty answer array 
2. Improve questions that lack context or are too revealing
"""

import json
import os
import re

BASE = "content/1-samuel/intrebari"

def load(ch):
    with open(f"{BASE}/ch{ch:02d}.json", "r", encoding="utf-8") as f:
        return json.load(f)

def save(data, ch):
    with open(f"{BASE}/ch{ch:02d}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Saved ch{ch:02d}")

# ===================== CH01 fixes =====================
def fix_ch01():
    d = load(1)
    # "Ce făcea Ana atunci când Penina o înțepa?" -> missing context: who are they
    for q in d["easy"]:
        if q.get("ref") == "1:7" and q.get("t") == "multi":
            q["q"] = "La Casa Domnului, Penina o înțepa pe Ana. Ce făcea atunci Ana, potrivit v. 7?"
    # The fill "de la ___ l-am cerut" -> answer is too obvious contextually
    for q in d["easy"]:
        if q.get("ref") == "1:20" and q.get("t") == "fill":
            q["q"] = "Ana a zis despre fiul ei nou-născut, Samuel: „căci de la ___ l-am cerut\"."
    save(d, 1)

# ===================== CH02 fixes =====================
def fix_ch02():
    d = load(2)
    # "Samuel s-a întors acasă, la Rama, împreună cu Elcana." - false, but misleading
    for q in d["easy"]:
        if q.get("ref") == "2:11" and q.get("t") == "tf":
            q["q"] = "După ce l-a lăsat pe Samuel la Eli, Elcana s-a întors acasă la Rama, iar Samuel a plecat cu el."
    # "Ce a spus în încheierea rugăciunii Anei?" options are misleading
    for q in d["hard"]:
        if q.get("ref") == "2:10" and q.get("t") == "multi":
            q["q"] = "Rugăciunea Anei se încheie cu un cuvânt despre Unsul lui Dumnezeu. Ce spune ea?"
            q["opts"] = [
                "Vrăjmașii Domnului vor tremura",
                "Domnul va judeca marginile pământului",
                "El va da Împăratului putere și va înălța tăria Unsului Lui"
            ]
            q["a"] = [1, 2]
    save(d, 2)

# ===================== CH03 fixes =====================
def fix_ch03():
    d = load(3)
    for q in d["easy"] + d["hard"]:
        # "Samuel nu cunoștea încă pe Domnul" - make sure context is clear
        if q.get("ref") == "3:7" and q.get("t") == "tf":
            q["q"] = "La momentul când Domnul l-a chemat prima dată, Samuel cunoștea deja glasul Lui și Cuvântul i-a fost descoperit."
            q["a"] = False
    save(d, 3)

# ===================== CH04 fixes =====================
def fix_ch04():
    d = load(4)
    for q in d["easy"] + d["hard"]:
        # "Ce s-a întâmplat la prima luptă cu filistenii?" questions context
        if q.get("ref") == "4:2" and q.get("t") == "one":
            q["q"] = "Câți oameni din Israel au căzut în prima ciocnire cu filistenii la Eben-Ezer?"
    save(d, 4)

# ===================== CH06 fixes =====================
def fix_ch06():
    d = load(6)
    for q in d["easy"] + d["hard"]:
        # Improve vague questions
        if q.get("t") == "tf" and "Bet-Șemeș" in q.get("q","") and "secerau" in q.get("q",""):
            q["q"] = "Locuitorii din Bet-Șemeș secerau grânele când au văzut chivotul întorcându-se."
    save(d, 6)

# ===================== CH08 fixes =====================
def fix_ch08():
    d = load(8)
    for q in d["hard"]:
        # "Ce lucra împăratul pe fii" question is too narrow
        if q.get("ref") == "8:12" and q.get("t") == "multi":
            q["q"] = "Potrivit descrierii lui Samuel, la ce lucrări îi va folosi împăratul pe fiii poporului?"
            q["opts"] = [
                "La aratul pământurilor lui",
                "La seceratul bucatelor lui",
                "La facerea armelor de război"
            ]
            q["a"] = [0, 1, 2]
    save(d, 8)

# ===================== CH09 fixes =====================
def fix_ch09():
    d = load(9)
    for q in d["easy"]:
        # "Cine era Saul?" - needs more context
        if q.get("ref") == "9:2" and q.get("t") == "one":
            q["q"] = "Cum este descris Saul, fiul lui Chis, față de ceilalți israeliți?"
    save(d, 9)

# ===================== CH10 fixes =====================
def fix_ch10():
    d = load(10)
    for q in d["easy"] + d["hard"]:
        # "Oare și Saul este între proroci?" - context needed
        if q.get("ref") == "10:12" and q.get("t") == "tf":
            q["q"] = 'Zicala \u201eOare \u0219i Saul este \u00eentre proroci?\u201d a ap\u0103rut dup\u0103 ce poporul l-a v\u0103zut prorocind la Ghibea.'
    save(d, 10)

# ===================== CH11 fixes =====================
def fix_ch11():
    d = load(11)
    for q in d["easy"]:
        if q.get("ref") == "11:1" and q.get("t") == "tf":
            q["q"] = "Nahaș, Amonitul, a venit și a împresurat Iabesul din Galaad, iar locuitorii au cerut îndată pace."
            q["a"] = True
    save(d, 11)

# ===================== CH12 fixes ===================== 
def fix_ch12():
    d = load(12)
    for q in d["easy"]:
        if q.get("ref") == "12:3" and q.get("t") == "multi":
            q["q"] = "Samuel le cere poporului să mărturisească dacă i-a nedreptățit. Ce îi întreabă el, potrivit textului?"
            q["opts"] = [
                "Cui i-a luat boul",
                "Cui i-a luat măgarul",
                "Pe cine a apăsat sau năpăstuit"
            ]
            q["a"] = [0, 2]
    save(d, 12)

# ===================== CH16 fixes =====================
def fix_ch16():
    d = load(16)
    for q in d["hard"]:
        # "multi ref 16:6-9 - Care fii respinși" - gives away the answer (David is the chosen)
        if q.get("ref") == "16:6-9" and q.get("t") == "multi":
            q["q"] = "Din fiii lui Isai care au trecut pe dinaintea lui Samuel, care au fost respinși de Domnul?"
            q["opts"] = [
                "Eliab",
                "Abinadab",
                "Șama"
            ]
            q["a"] = [0, 1, 2]
    save(d, 16)

# ===================== CH31 fixes =====================
def fix_ch31():
    d = load(31)
    # Fix the last hard question which has empty answer array
    for i, q in enumerate(d["hard"]):
        if q.get("ref") == "31:9-10" and q.get("t") == "multi" and q.get("a") == []:
            d["hard"][i] = {
                "t": "multi",
                "ref": "31:9-10",
                "q": "Ce au făcut filistenii cu armele lui Saul și cu trupul lui?",
                "opts": [
                    "Au pus armele în casa idolilor lor",
                    "Au atârnat trupul pe zidurile Bet-Șanului",
                    "I-au trimis capul lui David"
                ],
                "a": [0, 1]
            }
    save(d, 31)

# ===================== CH29 fixes =====================
def fix_ch29():
    d = load(29)
    # Check for any vague questions
    for q in d["easy"] + d["hard"]:
        if q.get("t") == "one" and "Ce a spus" in q.get("q","") and not any(name in q.get("q","") for name in ["Ahiș","David","Achis","Samuel","Saul","filisteni"]):
            q["q"] = q["q"].replace("Ce a spus", "Ce a spus Ahiș")
    save(d, 29)

# Run all fixes
fix_ch01()
fix_ch02()
fix_ch03()
fix_ch04()
fix_ch06()
fix_ch08()
fix_ch09()
fix_ch10()
fix_ch11()
fix_ch12()
fix_ch16()
fix_ch31()
fix_ch29()

print("All fixes applied!")
