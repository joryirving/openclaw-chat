#!/usr/bin/env python3
import json, os

pr_num = os.environ.get("PR_NUM", "")
with open("pr.json") as f:
    pr = json.load(f)
with open("pr.diff.truncated") as f:
    diff = f.read()
with open("linked-issues.md") as f:
    linked = f.read()
with open("pr-files.raw.json") as f:
    files = json.load(f)

pr_title = pr.get("title", "N/A")
author = pr.get("author", {}).get("login", "N/A")
url = pr.get("url", "N/A")
files_count = len(files)

corpus = f"""# PR #{pr_num}: {pr_title}
**Author:** @{author}
**URL:** {url}
**Files changed:** {files_count}

## Diff (truncated to 100k chars)
```
{diff[:100000]}
```

## Linked Issues
{linked}
"""

with open("review-corpus.md", "w") as f:
    f.write(corpus)
print(f"Corpus: {len(corpus)} bytes")
