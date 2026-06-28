#!/usr/bin/env bash
#
# Secret / credential / PII guard for this repo.
#
#   scripts/secret-scan.sh --cached   # scan staged changes (pre-commit hook)
#   scripts/secret-scan.sh --all      # scan every tracked file (CI backstop)
#
# Exits non-zero if anything secret-shaped is found, so it can gate a commit or
# a CI run. The local pre-commit hook (.githooks/pre-commit) runs `--cached`
# automatically once `core.hooksPath` is set — `pnpm install` does that via the
# package.json "prepare" script. CI (.github/workflows/secret-scan.yml) runs
# `--all` on every push and PR as the non-bypassable backstop.
#
# False positive on a local commit? Bypass with `git commit --no-verify` — but
# CI will still scan it, so only do that when you're certain it's safe.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

MODE="${1:---cached}"

# Lines/paths that are intentional placeholders or examples — never real secrets.
ALLOW='user:password|postgres:postgres@localhost|<[A-Z_]+>|EXAMPLE|example\.(com|org)|placeholder|dev-secret|o12345|abc123|your-|noreply@'

# "<extended-regex>|||<human label>"
PATTERNS=(
  'AKIA[0-9A-Z]{16}|||AWS access key id'
  'sk-[A-Za-z0-9]{20,}|||OpenAI-style API key'
  're_[A-Za-z0-9]{20,}|||Resend API key'
  '(sk|rk)_(live|test)_[A-Za-z0-9]{16,}|||Stripe secret key'
  'gh[posru]_[A-Za-z0-9]{30,}|||GitHub token'
  'AIza[0-9A-Za-z_-]{30,}|||Google API key'
  'xox[baprs]-[A-Za-z0-9-]{10,}|||Slack token'
  'BEGIN [A-Z ]*PRIVATE KEY|||private key block'
  'https://[0-9a-f]{16,}@o[0-9]+\.ingest\.|||real Sentry DSN'
  'postgres(ql)?://[^ @]+:[^ @]+@|||Postgres URL with embedded credentials'
  'rediss?://[^ @]+:[^ @]+@|||Redis URL with embedded credentials'
  'ep-[a-z0-9]+(-pooler)?\.[a-z0-9-]+\.aws\.neon\.tech|||real Neon database host'
  '[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo|proton(mail)?|icloud)\.[a-z]+|||personal email address'
)

fail=0
report() { # <hits> <label>
  echo "  ✗ $2"
  printf '%s\n' "$1" | sed 's/^/      /' | cut -c1-140
  fail=1
}

if [ "$MODE" = "--all" ]; then
  # Scan the content of every tracked file. Exclude this scanner and the hook
  # (they contain the patterns themselves) plus generated/lockfile noise.
  PATHSPEC=(
    -- .
    ':(exclude).env.example'
    ':(exclude)pnpm-lock.yaml'
    ':(exclude)*.tsbuildinfo'
    ':(exclude).githooks/*'
    ':(exclude)scripts/secret-scan.sh'
  )
  for p in "${PATTERNS[@]}"; do
    rx="${p%%|||*}"; label="${p##*|||}"
    hits="$(git grep -InE "$rx" "${PATHSPEC[@]}" 2>/dev/null | grep -Eiv "$ALLOW" || true)"
    [ -z "$hits" ] || report "$hits" "$label"
  done
else
  # Scan only the lines being ADDED in the staged diff, plus block sensitive
  # files from being staged at all.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      .env.example) : ;;
      .env|.env.*) report "$f" "staged env file (should be gitignored)";;
      *.pem|*.key|*.p12|*.pfx|*id_rsa*) report "$f" "staged secret-bearing file";;
    esac
  done < <(git diff --cached --name-only --diff-filter=AM)

  added="$(git diff --cached --unified=0 --no-color -- . \
    ':(exclude).env.example' \
    ':(exclude).githooks/*' \
    ':(exclude)scripts/secret-scan.sh' \
    | grep -E '^\+' | grep -Ev '^\+\+\+' || true)"
  for p in "${PATTERNS[@]}"; do
    rx="${p%%|||*}"; label="${p##*|||}"
    hits="$(printf '%s\n' "$added" | grep -InE "$rx" | grep -Eiv "$ALLOW" || true)"
    [ -z "$hits" ] || report "$hits" "$label"
  done
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "✋ secret-scan: potential secret / credential / PII detected (above)."
  echo "   Remove it before committing. Genuine false positive on a local commit?"
  echo "   Bypass with: git commit --no-verify  (CI still scans it on push)."
  exit 1
fi

echo "✓ secret-scan: clean ($MODE)"
