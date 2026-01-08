#!/bin/bash
set -euo pipefail

PR_NUMBER="${1:-}"

# 1) PR番号 自動検出（省略時）
if [ -z "$PR_NUMBER" ]; then
  PR_NUMBER="$(gh pr view --json number --jq '.number')"
fi

# 2) owner/repo 取得（現在のリポジトリ）
NAME_WITH_OWNER="$(gh repo view --json nameWithOwner --jq '.nameWithOwner')"
OWNER="${NAME_WITH_OWNER%%/*}"
REPO="${NAME_WITH_OWNER##*/}"

OUT_DIR=".claude/tmp/fix-pr-review"
mkdir -p "$OUT_DIR"

META_MD="$OUT_DIR/meta.md"
REVIEWS_MD="$OUT_DIR/reviews.md"
THREADS_MD="$OUT_DIR/unresolved_threads.md"
ALL_MD="$OUT_DIR/summary.md"

: > "$META_MD"
: > "$REVIEWS_MD"
: > "$THREADS_MD"
: > "$ALL_MD"

# --- PR Meta ---
echo "# Fix PR Review Summary" >> "$META_MD"
echo "" >> "$META_MD"
echo "## PR Meta" >> "$META_MD"

gh pr view "$PR_NUMBER" --json title,url,reviewDecision,author >> "$OUT_DIR/raw_pr.json"

echo "- PR: #$PR_NUMBER" >> "$META_MD"
echo "- Title: $(cat "$OUT_DIR/raw_pr.json" | jq -r '.title')" >> "$META_MD"
echo "- URL: $(cat "$OUT_DIR/raw_pr.json" | jq -r '.url')" >> "$META_MD"
echo "- Author: $(cat "$OUT_DIR/raw_pr.json" | jq -r '.author.login')" >> "$META_MD"
echo "- ReviewDecision: $(cat "$OUT_DIR/raw_pr.json" | jq -r '.reviewDecision // "null"')" >> "$META_MD"
echo "" >> "$META_MD"

# --- Reviews (review bodies) ---
echo "" >> "$REVIEWS_MD"
echo "## Reviews (Approve / Changes requested / Commented bodies)" >> "$REVIEWS_MD"
echo "" >> "$REVIEWS_MD"

REVIEWS_QUERY="$(cat <<'GRAPHQL'
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviews(first: 100) {
        nodes {
          state
          body
          submittedAt
          url
          author { login }
        }
      }
    }
  }
}
GRAPHQL
)"

gh api graphql \
  -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" \
  -f query="$REVIEWS_QUERY" > "$OUT_DIR/raw_reviews.json"

cat "$OUT_DIR/raw_reviews.json" | jq -r '
  .data.repository.pullRequest.reviews.nodes[]
  | select(.state == "CHANGES_REQUESTED" or .state == "APPROVED" or .state == "COMMENTED")
  | "### " + .state + " by @" + .author.login + " (" + .submittedAt + ")\n- URL: " + .url + "\n\n" + .body + "\n"
' >> "$REVIEWS_MD"

# --- Unresolved Threads Count (First) ---
echo "" >> "$THREADS_MD"
echo "## Unresolved Review Threads Analysis" >> "$THREADS_MD"
echo "" >> "$THREADS_MD"

AFTER=""
TOTAL_UNRESOLVED=0

echo "📊 **Counting unresolved threads...**" >> "$THREADS_MD"
echo "" >> "$THREADS_MD"

while : ; do
  if [ -z "$AFTER" ]; then
    THREADS_COUNT_QUERY="$(cat <<'GRAPHQL'
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved }
      }
    }
  }
}
GRAPHQL
)"

    RESP="$(gh api graphql \
      -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" \
      -f query="$THREADS_COUNT_QUERY")"
  else
    THREADS_COUNT_QUERY="$(cat <<'GRAPHQL'
query($owner: String!, $repo: String!, $pr: Int!, $after: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved }
      }
    }
  }
}
GRAPHQL
)"

    RESP="$(gh api graphql \
      -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" -F after="$AFTER" \
      -f query="$THREADS_COUNT_QUERY")"
  fi

  PAGE_UNRESOLVED="$(RESP="$RESP" python3 - <<'PY'
import json, os

d=json.loads(os.environ["RESP"])
nodes=d["data"]["repository"]["pullRequest"]["reviewThreads"]["nodes"]
print(sum(1 for t in nodes if not t.get("isResolved")))
PY
)"
  TOTAL_UNRESOLVED=$((TOTAL_UNRESOLVED + PAGE_UNRESOLVED))

  HAS_NEXT="$(RESP="$RESP" python3 - <<'PY'
import json, os

d=json.loads(os.environ["RESP"])
pi=d["data"]["repository"]["pullRequest"]["reviewThreads"]["pageInfo"]
print("true" if pi.get("hasNextPage") else "false")
PY
)"
  END_CURSOR="$(RESP="$RESP" python3 - <<'PY'
import json, os

d=json.loads(os.environ["RESP"])
pi=d["data"]["repository"]["pullRequest"]["reviewThreads"]["pageInfo"]
print(pi.get("endCursor") or "")
PY
)"

  if [ "$HAS_NEXT" != "true" ] || [ -z "$END_CURSOR" ]; then
    break
  fi

  AFTER="$END_CURSOR"
done

echo "**Unresolved threads: $TOTAL_UNRESOLVED**" >> "$THREADS_MD"
echo "" >> "$THREADS_MD"

if [ "$TOTAL_UNRESOLVED" -eq 0 ]; then
  echo "✅ All review threads have been marked as resolved." >> "$THREADS_MD"
  echo "" >> "$THREADS_MD"
  echo "📝 **Note**: This means all conversations have been marked as resolved using 'Resolve conversation' button," >> "$THREADS_MD"
  echo "but it doesn't necessarily mean all CodeRabbit actionable comments have been fixed in the code." >> "$THREADS_MD"
  echo "Check the Reviews section above for actionable comments that may still need to be addressed." >> "$THREADS_MD"
else
  echo "⚠️ There are still $TOTAL_UNRESOLVED unresolved review threads that need attention." >> "$THREADS_MD"
  echo "" >> "$THREADS_MD"
  echo "### Unresolved Thread Details:" >> "$THREADS_MD"
  echo "" >> "$THREADS_MD"

  # Re-run with full details for unresolved threads
  AFTER=""
  while : ; do
    if [ -z "$AFTER" ]; then
      THREADS_DETAIL_QUERY="$(cat <<'GRAPHQL'
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved
          isOutdated
          path
          line
          startLine
          originalLine
          originalStartLine
          comments(last: 1) {
            nodes {
              body
              url
              createdAt
              author { login }
            }
          }
        }
      }
    }
  }
}
GRAPHQL
)"

      RESP="$(gh api graphql \
        -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" \
        -f query="$THREADS_DETAIL_QUERY")"
    else
      THREADS_DETAIL_QUERY="$(cat <<'GRAPHQL'
query($owner: String!, $repo: String!, $pr: Int!, $after: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved
          isOutdated
          path
          line
          startLine
          originalLine
          originalStartLine
          comments(last: 1) {
            nodes {
              body
              url
              createdAt
              author { login }
            }
          }
        }
      }
    }
  }
}
GRAPHQL
)"

      RESP="$(gh api graphql \
        -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" -F after="$AFTER" \
        -f query="$THREADS_DETAIL_QUERY")"
    fi

    RESP="$RESP" python3 - <<'PY' >> "$THREADS_MD"
import json, os

d=json.loads(os.environ["RESP"])
nodes=d["data"]["repository"]["pullRequest"]["reviewThreads"]["nodes"]
for t in nodes:
  if t.get("isResolved") is True:
    continue

  path=t.get("path") or ""
  line=t.get("line") or t.get("originalLine") or 0
  start=t.get("startLine") or t.get("originalStartLine") or None
  outdated=t.get("isOutdated")

  c=(t.get("comments") or {}).get("nodes") or []
  last=c[0] if c else {}
  url=last.get("url") or ""
  who=((last.get("author") or {}).get("login")) or ""
  created=last.get("createdAt") or ""
  body=(last.get("body") or "").strip()

  loc=f"{path}:{line}" if not start else f"{path}:{start}-{line}"

  print(f"#### {loc}  (outdated={outdated})")
  if url:
    print(f"- URL: {url}")
  if who:
    print(f"- By: @{who} ({created})")
  print("")
  if body:
    print(body)
  else:
    print("(no body)")
  print("\n---\n")
PY

    HAS_NEXT="$(RESP="$RESP" python3 - <<'PY'
import json, os

d=json.loads(os.environ["RESP"])
pi=d["data"]["repository"]["pullRequest"]["reviewThreads"]["pageInfo"]
print("true" if pi.get("hasNextPage") else "false")
PY
)"
    END_CURSOR="$(RESP="$RESP" python3 - <<'PY'
import json, os

d=json.loads(os.environ["RESP"])
pi=d["data"]["repository"]["pullRequest"]["reviewThreads"]["pageInfo"]
print(pi.get("endCursor") or "")
PY
)"

    if [ "$HAS_NEXT" != "true" ] || [ -z "$END_CURSOR" ]; then
      break
    fi

    AFTER="$END_CURSOR"
  done
fi

# --- Build summary ---
cat "$META_MD" > "$ALL_MD"
echo "" >> "$ALL_MD"
cat "$REVIEWS_MD" >> "$ALL_MD"
echo "" >> "$ALL_MD"
cat "$THREADS_MD" >> "$ALL_MD"

echo "✅ Done: $ALL_MD"
