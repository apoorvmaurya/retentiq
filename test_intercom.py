import urllib.request
import json
import time
import os

def send_intercom_event(topic, details):
    payload = {
        "topic": topic,
        "data": {
            "item": details
        }
    }
    
    api_port = os.environ.get("API_PORT", "4000")
    url = f'http://localhost:{api_port}/api/integrations/intercom/webhook'
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            print(f"Sent {topic}: {res_data}")
            return True
    except Exception as e:
        print(f"Error sending {topic}:", e)
        return False

# 1. Test CSAT rated event
csat_details = {
    "id": "conv_csat_1",
    "conversation_rating": {
        "rating": 5,
        "remark": "Excellent support!"
    },
    "user": {
        "email": "test-1@example.com"
    }
}
print("--- Testing CSAT rated webhook ---")
send_intercom_event("conversation.rated", csat_details)

# 2. Test support tickets creation to trigger high-touch threshold (> 3 in last 7 days)
print("\n--- Testing 4 support tickets to trigger high-touch threshold ---")
for i in range(1, 5):
    ticket_details = {
        "id": f"conv_ticket_{i}_{int(time.time())}",
        "title": f"Help request number {i}",
        "priority": "high" if i % 2 == 0 else "standard",
        "url": f"https://intercom.com/conversations/{i}",
        "user": {
            "email": "test-1@example.com"
        }
    }
    print(f"Sending support ticket {i} of 4...")
    send_intercom_event("conversation.created", ticket_details)
    time.sleep(0.5)
