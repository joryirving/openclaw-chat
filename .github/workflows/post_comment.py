#!/usr/bin/env python3
import json, os, subprocess

pr_num = os.environ.get("PR_NUM", "")
skip = os.environ.get("SKIP", "false")
failed = os.environ.get("AI_FAILED", "true")
verdict = os.environ.get("VERDICT", "comment")
repo = os.environ.get("GITHUB_REPOSITORY", "")

if skip == "true":
    body = """<!-- wishlist-review-bot -->
:arrow_forward: Skipped: lockfile-only changes detected.
_Automated review is advisory._"""
elif failed == "true":
    body = """<!-- wishlist-review-bot -->
:information_source: AI review unavailable (API error).
_Automated review is advisory._"""
else:
    with open("ai-output.json") as f:
        data = json.load(f)
    prefix_map = {
        "approve": ":white_check_mark: **Recommend: APPROVE**",
        "request_changes": ":warning: **Recommend: REQUEST CHANGES**",
        "comment": ":speech_balloon: **AI Review**"
    }
    prefix = prefix_map.get(verdict, ":speech_balloon: **AI Review**")
    review_md = data.get("review_markdown", "# No review generated")
    concerns = data.get("concerns", [])
    concerns_part = ""
    if concerns:
        lines = ["## Concerns"]
        for c in concerns:
            sev = c.get("severity", "medium").upper()
            txt = c.get("text", "")
            lines.append(f"- **[{sev}]** {txt}")
        concerns_part = "\n\n" + "\n".join(lines)
    body = f"""<!-- wishlist-review-bot -->
{prefix}
_Engine: minimax-M2.7_

{review_md}{concerns_part}

_Automated review is advisory. Merge decision is always yours._
"""

with open("comment.md", "w") as f:
    f.write(body)
print(f"Comment written ({len(body)} bytes)")

result = subprocess.run(
    ["gh", "pr", "comment", pr_num, "--repo", repo, "--edit-last", "--create-if-none", "--body-file", "comment.md"],
    capture_output=True, text=True
)
if result.stdout:
    print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)
