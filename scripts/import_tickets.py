"""
Import anonymized tickets into Freshservice tenant for InsightDesk testing.
Usage: python import_tickets.py <api_key>
"""
import json
import sys
import time
import urllib.request
import urllib.error
import base64
import random

DOMAIN = "insightdesk"
BASE_URL = f"https://{DOMAIN}.freshservice.com/api/v2/tickets"
SOURCE_FILE = r"C:\Users\casta\.claude\outbox\businessone_tickets.json"

# FS status mapping: 2=Open, 3=Pending, 4=Resolved, 5=Closed
# FS priority: 1=Low, 2=Medium, 3=High, 4=Urgent
# FS source: 1=Email, 2=Portal, 3=Phone

def load_tickets():
    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def enrich_ticket(t):
    """Add fields InsightDesk needs that aren't in the anonymized data."""
    sources = [1, 1, 1, 2, 2, 3]  # weighted: mostly email/portal
    return {
        "subject": t["subject"][:255],
        "description": t.get("description") or t["subject"],
        "status": min(t.get("status", 2), 4),  # API won't accept 5 (Closed) on create
        "priority": t.get("priority", 1),
        "source": random.choice(sources),
        "category": t.get("category"),
        "type": t.get("type", "Incident"),
        "email": "test@insightdesk.freshservice.com",
    }

def create_ticket(ticket_data, auth_header):
    body = json.dumps(ticket_data).encode("utf-8")
    req = urllib.request.Request(
        BASE_URL,
        data=body,
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            return result.get("ticket", {}).get("id")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"  ERROR {e.code}: {error_body[:200]}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_tickets.py <freshservice_api_key>")
        sys.exit(1)

    api_key = sys.argv[1]
    auth_header = "Basic " + base64.b64encode(f"{api_key}:X".encode()).decode()

    tickets = load_tickets()
    print(f"Loaded {len(tickets)} tickets from {SOURCE_FILE}")

    created = 0
    errors = 0
    for i, t in enumerate(tickets):
        enriched = enrich_ticket(t)
        ticket_id = create_ticket(enriched, auth_header)
        if ticket_id:
            created += 1
            if created % 20 == 0:
                print(f"  [{created}/{len(tickets)}] Created ticket #{ticket_id}")
        else:
            errors += 1

        # Rate limit: FS API allows ~40 req/min on trial
        if (i + 1) % 30 == 0:
            print(f"  Rate limit pause... ({created} created, {errors} errors)")
            time.sleep(15)

    print(f"\nDone: {created} created, {errors} errors out of {len(tickets)} total")

if __name__ == "__main__":
    main()
