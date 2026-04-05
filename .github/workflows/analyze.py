#!/usr/bin/env python3
import json, os, urllib.request

system = "You are a PR reviewer for miso-chat, a Node.js Express chat app. Review wishlist-cron PRs from itsmiso-ai. Return ONLY valid JSON with no markdown formatting: {\"verdict\": \"approve\" or \"request_changes\" or \"comment\", \"summary\": \"one sentence\", \"review_markdown\": \"markdown body\", \"concerns\": [{\"severity\": \"high\" or \"medium\" or \"low\", \"text\": \"issue text\"}], \"confidence\": \"high\" or \"medium\" or \"low\"}. Be conservative."

with open("review-corpus.md") as f:
    corpus = f.read()

request = {
    "model": "MiniMax-M2.7",
    "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Review this PR. Return JSON only.\n\n" + corpus}
    ],
    "temperature": 0.1
}

req = urllib.request.Request(
    "https://api.minimax.io/anthropic/v1/chat/completions",
    data=json.dumps(request).encode(),
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + os.environ["MINIMAX_API_KEY"]
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if content:
            content = content.strip().strip("`").replace("```json", "").replace("```", "").strip()
            output = json.loads(content)
            with open("ai-output.json", "w") as f:
                json.dump(output, f)
            verdict = output.get("verdict", "comment")
            print("verdict=" + verdict)
            with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                f.write(f"verdict={verdict}\n")
                f.write("ai_failed=false\n")
        else:
            print("No content in response")
            with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                f.write("verdict=comment\nai_failed=true\n")
except Exception as e:
    print(f"Error: {e}")
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write("verdict=comment\nai_failed=true\n")
