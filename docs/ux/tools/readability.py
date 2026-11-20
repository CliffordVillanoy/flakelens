import io, re, sys
DOC = sys.argv[1] if len(sys.argv) > 1 else "docs/ux/04-ux-copy.md"
# Domain words a user of this tool knows; they would wrongly inflate the grade.
DOMAIN = {"playwright", "json", "junit", "xml", "ci", "csv", "flaky", "commit", "commits", "retry", "retries", "repeat-each"}

def syllables(w):
    w = w.lower().strip(".,;:!?()\"'")
    if not w or w in DOMAIN: return 1
    if len(w) <= 3: return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))

def grade(text):
    t = re.sub(r"\{[^}]*\}", "5", text)               # ICU placeholders read as a number
    t = re.sub(r"`[^`]*`", "it", t)                   # code reads as one word
    sents = [x for x in re.split(r"[.!?]+(?:\s|$)", t) if x.strip()]
    words = re.findall(r"[A-Za-z0-9'’\-]+", t)
    if len(words) < 6: return None, len(words)        # labels: grade is meaningless
    syl = sum(syllables(w) for w in words)
    return round(0.39 * len(words) / max(1, len(sents)) + 11.8 * syl / len(words) - 15.59, 1), len(words)

rows = []
for line in io.open(DOC, encoding="utf-8"):
    if not line.startswith("| `"): continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    key, copy = cells[0].strip("`"), cells[-1]
    g, n = grade(copy)
    if g is not None: rows.append((g, n, key, copy))
rows.sort(reverse=True)
over = [r for r in rows if r[0] > 9]
print("scored", len(rows), "strings; above grade 9:", len(over))
for g, n, key, copy in rows[:25]:
    print(f"{g:5}  {n:3}w  {key:28} {copy[:110]}")
avg = sum(r[0] for r in rows) / len(rows)
print("mean grade", round(avg, 1))
