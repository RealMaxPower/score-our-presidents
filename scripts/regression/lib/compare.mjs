// Diffs two capture runs (base vs head) and writes an HTML report.
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Lines only in one side, in order; enough to see what changed.
function lineDiff(a, b, max = 40) {
  const al = a.split("\n");
  const bl = b.split("\n");
  const bs = new Set(bl);
  const as = new Set(al);
  return {
    removed: al.filter((l) => !bs.has(l)).slice(0, max),
    added: bl.filter((l) => !as.has(l)).slice(0, max),
  };
}

function comparePixels(baseFile, headFile, diffFile) {
  const a = PNG.sync.read(readFileSync(baseFile));
  const b = PNG.sync.read(readFileSync(headFile));
  if (a.width !== b.width || a.height !== b.height) {
    return { sizeChanged: true, base: `${a.width}x${a.height}`, head: `${b.width}x${b.height}` };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  // Strict: rendering is deterministic (self-comparisons are pixel-identical
  // at threshold 0), and a looser threshold misses real shifts such as
  // cream #fafaf5 turning white.
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0,
    includeAA: false,
  });
  if (n > 0) writeFileSync(diffFile, PNG.sync.write(diff));
  return { pixels: n, pct: (100 * n) / (a.width * a.height) };
}

export function compareRuns({ base, head, baseDir, headDir, reportDir, flows }) {
  mkdirSync(join(reportDir, "img"), { recursive: true });
  const key = (r) => `${r.route} | ${r.variant}`;
  const baseByKey = new Map(base.map((r) => [key(r), r]));
  const headKeys = new Set(head.map(key));
  const findings = [];
  const notes = [];
  const add = (f) => findings.push(f);

  for (const b of base) if (!headKeys.has(key(b))) add({ kind: "missing", where: key(b) });

  for (const [side, rows] of [["base", base], ["head", head]]) {
    for (const r of rows) {
      if (r.hydrationErrors?.length) {
        notes.push({
          kind: `hydration error on ${side} (capture retried)`,
          where: key(r),
          detail: r.hydrationErrors.join("\n"),
        });
      }
    }
  }

  for (const h of head) {
    const where = key(h);
    const b = baseByKey.get(where);
    if (!b) {
      add({ kind: "new-route", where });
      continue;
    }
    if (b.error || h.error) {
      if (h.error && !b.error) add({ kind: "error", where, detail: h.error });
      continue;
    }
    if (b.status !== h.status) add({ kind: "status", where, detail: `${b.status} → ${h.status}` });

    const stem = h.file.replace(/\.png$/, "");
    const px = comparePixels(
      join(baseDir, "shots", b.file),
      join(headDir, "shots", h.file),
      join(reportDir, "img", `${stem}--diff.png`)
    );
    if (px.sizeChanged || px.pixels > 0) {
      copyFileSync(join(baseDir, "shots", b.file), join(reportDir, "img", `${stem}--base.png`));
      copyFileSync(join(headDir, "shots", h.file), join(reportDir, "img", `${stem}--head.png`));
      add({ kind: px.sizeChanged ? "size" : "pixels", where, stem, ...px });
    }

    if (b.text !== undefined && b.text !== h.text) add({ kind: "text", where, ...lineDiff(b.text, h.text) });
    for (const [name, value] of Object.entries(h.headers ?? {})) {
      if (b.headers?.[name] !== value) add({ kind: "header", where, detail: `${name}: ${b.headers?.[name]} → ${value}` });
    }
    for (const [id, count] of Object.entries(h.axe ?? {})) {
      const before = b.axe?.[id] ?? 0;
      if (count > before) add({ kind: "a11y", where, detail: `${id}: ${before} → ${count} nodes` });
    }
    const newConsole = h.consoleErrors.filter((m) => !b.consoleErrors.includes(m));
    if (newConsole.length) add({ kind: "console", where, detail: newConsole.join("\n") });
    // Errors already on base aren't regressions, but they are bugs (or flaky
    // behaviour) worth seeing, so they're reported as notes.
    const baseErrors = b.consoleErrors.filter((m) => !newConsole.includes(m));
    if (baseErrors.length) notes.push({ kind: "console on base", where, detail: baseErrors.join("\n") });
    const newFailed = h.failedRequests.filter((m) => !b.failedRequests.includes(m));
    if (newFailed.length) add({ kind: "request", where, detail: newFailed.join("\n") });
  }

  for (const f of flows ?? []) {
    if (!f.head.ok || !f.base.ok || JSON.stringify(f.base.observed) !== JSON.stringify(f.head.observed)) {
      add({
        kind: "flow",
        where: f.name,
        detail: `base: ${f.base.ok ? "pass" : `FAIL ${f.base.error}`}\nhead: ${f.head.ok ? "pass" : `FAIL ${f.head.error}`}\nbase observed: ${JSON.stringify(f.base.observed)}\nhead observed: ${JSON.stringify(f.head.observed)}`,
      });
    }
  }

  writeFileSync(join(reportDir, "findings.json"), JSON.stringify({ findings, notes }, null, 2));
  writeFileSync(join(reportDir, "index.html"), renderReport(findings, { base, head, flows, notes }));
  return { findings, notes };
}

function renderReport(findings, { base, head, flows, notes }) {
  const counts = {};
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  const items = findings
    .map((f) => {
      if (f.kind === "pixels" || f.kind === "size") {
        const label = f.kind === "size" ? `size ${f.base} → ${f.head}` : `${f.pixels} px (${f.pct.toFixed(3)}%)`;
        const diffImg = f.kind === "pixels" ? `<figure><figcaption>diff</figcaption><img src="img/${f.stem}--diff.png"></figure>` : "";
        return `<section><h3>${esc(f.where)} — ${label}</h3><div class="row">
<figure><figcaption>base</figcaption><img src="img/${f.stem}--base.png"></figure>
<figure><figcaption>head</figcaption><img src="img/${f.stem}--head.png"></figure>${diffImg}</div></section>`;
      }
      if (f.kind === "text") {
        return `<section><h3>${esc(f.where)} — text</h3><pre class="rm">${esc(f.removed.map((l) => `- ${l}`).join("\n"))}</pre><pre class="ad">${esc(f.added.map((l) => `+ ${l}`).join("\n"))}</pre></section>`;
      }
      return `<section><h3>${esc(f.where)} — ${f.kind}</h3><pre>${esc(f.detail ?? "")}</pre></section>`;
    })
    .join("\n");
  const flowRows = (flows ?? [])
    .map((f) => `<tr><td>${esc(f.name)}</td><td>${f.base.ok ? "pass" : "FAIL"}</td><td>${f.head.ok ? "pass" : "FAIL"}</td></tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>Regression report</title>
<style>body{font:14px system-ui;margin:16px}figure{margin:0;flex:1;min-width:0}img{width:100%;border:1px solid #ccc}
.row{display:flex;gap:8px;align-items:flex-start}pre{white-space:pre-wrap;background:#f6f6f6;padding:8px}
.rm{background:#fee}.ad{background:#efe}section{margin:24px 0;border-top:1px solid #ddd}td,th{padding:2px 8px;text-align:left}</style>
<h1>Regression report</h1>
<p>${head.length} captures on head, ${base.length} on base. ${findings.length} finding(s): ${esc(JSON.stringify(counts))}</p>
<h2>Flows</h2><table><tr><th>flow</th><th>base</th><th>head</th></tr>${flowRows}</table>
<h2>Findings</h2>${items || "<p>None.</p>"}
<h2>Notes (not regressions)</h2>${
    notes.map((n) => `<section><h3>${esc(n.where)} — ${esc(n.kind)}</h3><pre>${esc(n.detail)}</pre></section>`).join("\n") ||
    "<p>None.</p>"
  }`;
}
