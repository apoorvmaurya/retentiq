import urllib.request
import json
import os

payload = {
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "customer_email": "test-1@example.com",
      "items": {
        "data": [
          {
            "price": {
              "unit_amount": 19900,
              "nickname": "Enterprise"
            }
          }
        ]
      },
      "metadata": {
        "customer_id": "5af7c9bb-e97f-53ec-824f-33599f1e7a27"
      }
    }
  }
}

api_port = os.environ.get("API_PORT", "4000")
url = f'http://localhost:{api_port}/api/integrations/stripe/webhook'
req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

print(f"Sending mock Stripe webhook to localhost:{api_port}...")
try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        print("Response:", html.decode('utf-8'))
except Exception as e:
    print("Error sending webhook:", e)
