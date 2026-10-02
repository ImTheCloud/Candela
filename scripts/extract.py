import json
import re
from collections import Counter

with open('/Users/claudiupopadiuc/Documents/GitHub/Candela/content/1-samuel/text-cornilescu.json') as f:
    data = json.load(f)

capitalized_words = Counter()
all_words = set()

for ch, verses in data.items():
    for verse in verses:
        # Extract words
        words = re.findall(r'\b[A-ZĂÎÂȘȚa-zăîâșț]+\b', verse)
        all_words.update([w.lower() for w in words])
        
        # Extract capitalized words/phrases
        # We can just extract capitalized words not at the beginning of the sentence
        # But to be safe, let's extract all capitalized words
        cap_words = re.findall(r'\b[A-ZĂÎÂȘȚ][A-ZĂÎÂȘȚa-zăîâșț-]*\b', verse)
        capitalized_words.update(cap_words)

print("--- Capitalized Words (Count >= 1) ---")
# Filter out common starting words if needed, but let's just print them sorted by frequency
for word, count in capitalized_words.most_common(200):
    print(f"{word}: {count}")

