#!/usr/bin/env python3
"""
Lens accuracy audit — checks what the lens presets actually do to each president.

Reuses the weight vectors and math from compute_rankings.py, then reports the
figures that the per-president lens claims in scores/*.yaml are checked against:
weighted total per lens, rank per lens, score/rank spread, and the diagnostics
behind the divergence collapse (Spearman vs Default, weight-vector L1 distance,
cross-category correlation).

Backing document: docs/methodology/lens-accuracy-audit-v1.3.md
Usage: python3 scripts/lens_audit.py
"""
import itertools
import math
from pathlib import Path

# compute_rankings.py runs its report from main(); take everything above it so
# the weights and math stay single-sourced without triggering that output.
_src = Path(__file__).with_name("compute_rankings.py").read_text().split("def main()")[0]
_ns = {}
exec(compile(_src, "compute_rankings.py", "exec"), _ns)

WEIGHTS = _ns["WEIGHTS"]
PRESIDENTS = _ns["PRESIDENTS"]
load_president = _ns["load_president"]
compute_category_nets = _ns["compute_category_nets"]
compute_weighted_total = _ns["compute_weighted_total"]

CATEGORIES = list(range(1, 14))


def spearman(a, b):
    n = len(a)
    d2 = sum((a[i] - b[i]) ** 2 for i in range(n))
    return 1 - 6 * d2 / (n * (n * n - 1))


def pearson(x, y):
    mx, my = sum(x) / len(x), sum(y) / len(y)
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    den = math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
    return num / den if den else 0.0


def main():
    data = {p: load_president(p) for p in PRESIDENTS}
    nets = {p: compute_category_nets(d) for p, d in data.items()}
    display = {p: data[p]["display_name"] for p in PRESIDENTS}
    lenses = list(WEIGHTS)

    totals = {l: {p: compute_weighted_total(nets[p], w) for p in PRESIDENTS} for l, w in WEIGHTS.items()}
    ranks = {
        l: {p: i for i, (p, _) in enumerate(sorted(totals[l].items(), key=lambda kv: -kv[1]), 1)}
        for l in lenses
    }

    print("# Lens accuracy audit\n")
    print("## Weighted total and rank per lens\n")
    header = f"{'President':24}" + "".join(f"{l[:6]:>8}" for l in lenses)
    print(header + f"{'score_sp':>10}{'rank_sp':>9}")
    spreads = []
    for p in PRESIDENTS:
        scores = [totals[l][p] for l in lenses]
        rk = [ranks[l][p] for l in lenses]
        score_spread, rank_spread = max(scores) - min(scores), max(rk) - min(rk)
        spreads.append((display[p], score_spread, rank_spread))
        print(
            f"{display[p]:24}"
            + "".join(f"{s:+8.2f}" for s in scores)
            + f"{score_spread:10.2f}{rank_spread:9d}"
        )
        print(f"{'  ranks':24}" + "".join(f"{r:8d}" for r in rk))

    print("\n## Cross-lens variance ranking (largest first)\n")
    for name, ss, rs in sorted(spreads, key=lambda t: -t[1]):
        print(f"  {name:24} score_spread={ss:5.2f}  rank_spread={rs}")

    print("\n## Best / worst lens per president\n")
    for p in PRESIDENTS:
        ordered = sorted(((totals[l][p], l) for l in lenses), reverse=True)
        print(
            f"  {display[p]:24} best={ordered[0][1]:17}({ordered[0][0]:+.2f})"
            f"  worst={ordered[-1][1]:17}({ordered[-1][0]:+.2f})"
        )

    print("\n## Divergence diagnostics\n")
    base_ranks = [ranks["Default"][p] for p in PRESIDENTS]
    for l in lenses:
        if l == "Default":
            continue
        rho = spearman(base_ranks, [ranks[l][p] for p in PRESIDENTS])
        l1 = sum(abs(WEIGHTS[l][c] - WEIGHTS["Default"][c]) for c in CATEGORIES)
        print(f"  {l:18} spearman_vs_default={rho:.3f}  weight_L1_from_default={l1:3d}")

    complete = [p for p in PRESIDENTS if all(nets[p][c] is not None for c in CATEGORIES)]
    cors = [
        pearson([nets[p][i] for p in complete], [nets[p][j] for p in complete])
        for i, j in itertools.combinations(CATEGORIES, 2)
    ]
    print(f"\n  presidents with all 13 categories scored: {len(complete)}")
    print(f"  mean pairwise correlation between category nets: {sum(cors) / len(cors):.3f}")
    print(f"  share of category pairs with r > 0.5: {sum(1 for c in cors if c > 0.5) / len(cors):.0%}")


if __name__ == "__main__":
    main()
