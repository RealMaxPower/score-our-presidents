#!/usr/bin/env python3
"""
Compute lens-weighted rankings for the Presidential Scoring Framework.
Reads 16 YAML scoring files and applies 9 weight vectors (default + 8 lenses).
Handles Cat 10 dropping for Biden and Trump T2 with proportional renormalization.
Applies v1.3 weight revisions from weight-validation-v1.md.
"""
import yaml
import os
from pathlib import Path

SCORES_DIR = "scores"

# v1.3 weight vectors (incorporating Workstream C revisions)
# Default: Cat 8 7% → 8%, Cat 13 7% → 6% (taking from Cat 13 to fund Cat 8)
WEIGHTS = {
    "Default": {1: 9, 2: 11, 3: 9, 4: 8, 5: 9, 6: 6, 7: 9, 8: 8, 9: 8, 10: 7, 11: 4, 12: 6, 13: 6},
    "Progressive": {1: 9, 2: 9, 3: 14, 4: 7, 5: 14, 6: 11, 7: 7, 8: 5, 9: 7, 10: 3, 11: 1, 12: 1, 13: 12},
    "ClassicalLiberal": {1: 11, 2: 9, 3: 9, 4: 15, 5: 5, 6: 4, 7: 7, 8: 11, 9: 11, 10: 5, 11: 2, 12: 2, 13: 9},
    # Conservative: Cat 8 9% → 10%, Cat 7 11% → 10%
    "Conservative": {1: 13, 2: 13, 3: 5, 4: 7, 5: 5, 6: 4, 7: 10, 8: 10, 9: 5, 10: 7, 11: 7, 12: 3, 13: 11},
    "Libertarian": {1: 13, 2: 7, 3: 7, 4: 19, 5: 3, 6: 4, 7: 7, 8: 13, 9: 11, 10: 3, 11: 1, 12: 2, 13: 10},
    "Communitarian": {1: 7, 2: 7, 3: 7, 4: 5, 5: 11, 6: 7, 7: 7, 8: 9, 9: 7, 10: 7, 11: 7, 12: 7, 13: 12},
    "Realist": {1: 9, 2: 21, 3: 6, 4: 6, 5: 6, 6: 4, 7: 15, 8: 7, 9: 6, 10: 13, 11: 1, 12: 1, 13: 5},
    "Populist": {1: 13, 2: 7, 3: 6, 4: 6, 5: 13, 6: 3, 7: 9, 8: 4, 9: 6, 10: 6, 11: 2, 12: 11, 13: 14},
    # Internationalist: Cat 2 15% → 13%, Cat 10 4% → 6%
    "Internationalist": {1: 6, 2: 13, 3: 8, 4: 8, 5: 6, 6: 11, 7: 8, 8: 8, 9: 8, 10: 6, 11: 2, 12: 8, 13: 8},
}

# Validate all sum to 100
for lens, w in WEIGHTS.items():
    total = sum(w.values())
    assert total == 100, f"{lens} weights sum to {total}, not 100"

# Presidents in chronological order
PRESIDENTS = [
    "franklin_d_roosevelt", "harry_s_truman", "dwight_d_eisenhower", "john_f_kennedy",
    "lyndon_b_johnson", "richard_nixon", "gerald_ford", "jimmy_carter",
    "ronald_reagan", "george_h_w_bush", "bill_clinton", "george_w_bush",
    "barack_obama", "donald_trump_t1", "joe_biden", "donald_trump_t2",
]


def load_president(slug):
    """Load YAML file for a president and return parsed dict."""
    path = Path(SCORES_DIR) / f"{slug}.yaml"
    with open(path) as f:
        return yaml.safe_load(f)


def compute_category_nets(data):
    """For each category, compute mean of sub-criteria nets. Returns dict {category_num: net or None}."""
    nets = {}
    for cat in data["categories"]:
        cat_num = cat["category"]
        sub_nets = []
        for sub in cat["sub_criteria"]:
            g = sub.get("good_score")
            h = sub.get("harm_score")
            # Skip null scores (Cat 10 dropped for Biden/Trump T2; some N/A like Cat 6.1 for pre-environmental)
            if g is None or h is None:
                continue
            # Skip 0/0 era-N/A entries (Cat 6.1 for pre-1988 presidents, Cat 3.3 for FDR)
            if g == 0 and h == 0:
                continue
            sub_nets.append(g - h)
        if sub_nets:
            nets[cat_num] = sum(sub_nets) / len(sub_nets)
        else:
            nets[cat_num] = None  # Category fully dropped/N/A
    return nets


def compute_weighted_total(category_nets, weights):
    """Apply weight vector to category nets. Handles Cat 10 drops via proportional renorm."""
    # Determine which categories are scored
    scored_cats = {c: n for c, n in category_nets.items() if n is not None}

    # Total weight on scored categories under the original vector
    used_weight = sum(weights[c] for c in scored_cats.keys())

    # Proportional renormalization scaling factor
    if used_weight == 0:
        return None
    scale = 100 / used_weight  # multiplier to bring used weights back to 100%

    weighted_total = sum(category_nets[c] * weights[c] * scale / 100 for c in scored_cats.keys())
    return weighted_total


def main():
    # Load all presidents
    all_data = {p: load_president(p) for p in PRESIDENTS}

    # Compute category nets for each
    cat_nets = {p: compute_category_nets(d) for p, d in all_data.items()}

    # Compute weighted totals for each lens × president
    results = {}
    for lens, weights in WEIGHTS.items():
        results[lens] = {}
        for p in PRESIDENTS:
            wt = compute_weighted_total(cat_nets[p], weights)
            results[lens][p] = wt

    # Display name lookup
    display = {p: all_data[p]["display_name"] for p in PRESIDENTS}

    # Output: per-lens rankings
    print("# Lens-Weighted Rankings — Phase 1\n")
    print("Spec v1.2 + Workstream C v1.3 weight revisions applied.\n")
    print("Cat 10 dropped for Biden and Trump T2 per v1.2 §9.4; remaining categories proportionally renormalized.\n\n")

    print("## Category nets per president (intermediate computation)\n")
    print("| President | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 |")
    print("|-----------|---:|---:|---:|---:|---:|---:|---:|---:|---:|----:|----:|----:|----:|")
    for p in PRESIDENTS:
        cats = cat_nets[p]
        row = [display[p]]
        for c in range(1, 14):
            v = cats.get(c)
            row.append(f"{v:+.1f}" if v is not None else "—")
        print("| " + " | ".join(row) + " |")
    print()

    print("## Per-lens rankings (sorted by weighted total, descending)\n")
    for lens in WEIGHTS:
        print(f"### {lens} lens\n")
        ranked = sorted(results[lens].items(), key=lambda x: x[1], reverse=True)
        print("| Rank | President | Weighted Total |")
        print("|-----:|-----------|---------------:|")
        for i, (p, wt) in enumerate(ranked, 1):
            print(f"| {i} | {display[p]} | {wt:+.2f} |")
        print()

    # Cross-lens comparison: each president's rank across all 9 lenses
    print("## Cross-lens rank comparison\n")
    print("Per president: rank under each of 9 weight vectors. Spread = max rank − min rank.\n")
    print("| President | Def | Prog | ClLib | Cons | Libt | Comm | Real | Pop | Intl | Spread |")
    print("|-----------|----:|-----:|------:|-----:|-----:|-----:|-----:|----:|-----:|-------:|")

    # Compute ranks per lens
    lens_ranks = {}
    for lens in WEIGHTS:
        ranked = sorted(results[lens].items(), key=lambda x: x[1], reverse=True)
        lens_ranks[lens] = {p: i for i, (p, _) in enumerate(ranked, 1)}

    lens_short = ["Default", "Progressive", "ClassicalLiberal", "Conservative", "Libertarian",
                  "Communitarian", "Realist", "Populist", "Internationalist"]
    for p in PRESIDENTS:
        ranks = [lens_ranks[lens][p] for lens in lens_short]
        spread = max(ranks) - min(ranks)
        row = [display[p]] + [str(r) for r in ranks] + [str(spread)]
        print("| " + " | ".join(row) + " |")
    print()


if __name__ == "__main__":
    main()
