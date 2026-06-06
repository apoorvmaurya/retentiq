import json

log_path = r"C:\Users\apoor\.gemini\antigravity-ide\brain\e3b80a06-d5d9-4265-b652-261e0bb705b7\.system_generated\logs\transcript.jsonl"

print("--- Database Errors or References in Previous Conversation ---")
occurrences = []
with open(log_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line)
            content = data.get("content", "")
            if "econnrefused" in content.lower() or "54322" in content.lower() or "connection error" in content.lower() or "database error" in content.lower():
                occurrences.append((idx, "content", content[:300]))
            
            # check tool calls output
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    if "args" in tc:
                        args_str = json.dumps(tc["args"])
                        if "54322" in args_str or "postgres" in args_str:
                            occurrences.append((idx, "tool_call_args", args_str[:300]))
            
            # check tool response
            if data.get("type") in ("RUN_COMMAND", "LIST_DIRECTORY", "VIEW_FILE") and data.get("status") == "DONE":
                resp_content = data.get("content", "")
                if "54322" in resp_content or "connection refused" in resp_content.lower() or "econnrefused" in resp_content.lower():
                    occurrences.append((idx, "tool_response", resp_content[:300]))
        except Exception as e:
            pass

for idx, type_src, snippet in occurrences:
    print(f"Step {idx} ({type_src}): {snippet}...\n")
