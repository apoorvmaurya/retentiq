import urllib.request
import json

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

req = urllib.request.Request(
    'http://localhost:3001/api/integrations/stripe/webhook',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

print("Sending mock Stripe webhook to localhost:3001...")
try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        print("Response:", html.decode('utf-8'))
except Exception as e:
    print("Error sending webhook:", e)
