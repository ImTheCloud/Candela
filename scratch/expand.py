import json
import os
import re

def normalize(text):
    return re.sub(r'[^a-zA-Z0-9ăîâșțĂÎÂȘȚ]', '', text.lower())

with open('content/1-samuel/text-cornilescu.json', 'r', encoding='utf-8') as f:
    bible = json.load(f)

def find_sub(verse, full_sub):
    # create a regex from full_sub that ignores case and punctuation
    # e.g., "Dar David s-a îmbărbătat" -> "Dar\W+David\W+s\W*a\W+îmbărbătat"
    # Actually, it's easier:
    words = re.findall(r'[a-zA-Z0-9ăîâșțĂÎÂȘȚ]+', full_sub)
    if not words: return None
    
    pattern = r'\W*'.join(words)
    # We want to match the exact words
    match = re.search(pattern, verse, re.IGNORECASE)
    if match:
        return match.start(), match.end()
    return None

q_dir = 'content/1-samuel/intrebari'
for file in sorted(os.listdir(q_dir)):
    if not file.endswith('.json'): continue
    path = os.path.join(q_dir, file)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    ch = str(data['ch'])
    modified = False
    
    for level in ['easy', 'hard']:
        for q in data.get(level, []):
            if q.get('t') == 'fill':
                ref = q.get('ref')
                if '-' in ref:
                    continue # skip ranges
                if ',' in ref:
                    continue
                v_num = ref.split(':')[1]
                verse = bible[ch][int(v_num)-1]
                
                # Check if q.q is already full verse
                if len(q['q']) > len(verse) * 0.8:
                    continue
                
                # Reconstruct full_sub
                full_sub = q['q']
                ans = q['a']
                for a in ans:
                    val = a[0] if isinstance(a, list) else a
                    full_sub = full_sub.replace('___', val, 1)
                
                # Find bounds
                bounds = find_sub(verse, full_sub)
                if bounds:
                    start, end = bounds
                    # Now we want to replace the `ans` inside the VERSE with `___`
                    # The easiest way is to use the original q['q'] as a template
                    # but q['q'] might have different punctuation.
                    # Instead, let's find each answer word INSIDE the matched portion of the verse!
                    
                    matched_portion = verse[start:end]
                    
                    # We need to replace `val` with `___` inside `matched_portion`
                    # BUT carefully, in the same order.
                    for a in ans:
                        val = a[0] if isinstance(a, list) else a
                        # match val exactly
                        val_pattern = r'(?i)\b' + re.escape(val) + r'\b'
                        matched_portion = re.sub(val_pattern, '___', matched_portion, count=1)
                    
                    # New q.q is the verse with the matched portion replaced by the modified matched_portion
                    new_q = verse[:start] + matched_portion + verse[end:]
                    
                    if '___' in new_q:
                        q['q'] = new_q
                        modified = True
                    else:
                        print(f"Failed to replace blanks in {ch}:{v_num}")
                else:
                    print(f"Could not find match for {ch}:{v_num} | {full_sub}")
                    
    if modified:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=1, ensure_ascii=False)

print("Done.")
