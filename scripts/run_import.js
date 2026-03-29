const fs = require("fs");
const https = require("https");

const API_KEY = process.argv[2];
if (!API_KEY) { console.log("Usage: node run_import.js <api_key>"); process.exit(1); }

const DOMAIN = "insightdesk";
const tickets = JSON.parse(fs.readFileSync("C:\\Users\\casta\\.claude\\outbox\\businessone_tickets.json", "utf8"));
const auth = Buffer.from(API_KEY + ":X").toString("base64");
const sources = [1,1,1,2,2,3];
const VALID_CATS = ["Hardware","Software","Network","Other","Office Applications","Office Furniture","Office Equipment","Employee Records"];
const CAT_MAP = {
  "Analytics Platform": "Software",
  "Power BI": "Software",
  "IT - ERP": "Software",
  "IT - Digital": "Network",
  "Data Integration": "Software",
  "Data Visualization": "Software",
  "Data Modelling": "Software",
};

function mapCategory(cat) {
  if (!cat) return null;
  if (VALID_CATS.includes(cat)) return cat;
  if (CAT_MAP[cat]) return CAT_MAP[cat];
  return "Software";
}

let created = 0, errors = 0, idx = 0;

function createNext() {
  if (idx >= tickets.length) {
    console.log("DONE: " + created + " created, " + errors + " errors");
    return;
  }
  const t = tickets[idx++];
  const body = JSON.stringify({
    subject: (t.subject || "Ticket").substring(0, 255),
    description: t.description || t.subject || "No description",
    status: Math.min(t.status || 2, 4),
    priority: t.priority || 1,
    source: sources[Math.floor(Math.random() * sources.length)],
    category: mapCategory(t.category),
    type: t.type || "Incident",
    email: "test@insightdesk.freshservice.com"
  });

  const options = {
    hostname: DOMAIN + ".freshservice.com",
    path: "/api/v2/tickets",
    method: "POST",
    headers: {
      "Authorization": "Basic " + auth,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (c) => data += c);
    res.on("end", () => {
      if (res.statusCode === 201) {
        created++;
        if (created % 25 === 0) console.log("  [" + created + "/" + tickets.length + "]");
      } else {
        errors++;
        if (errors <= 3) console.log("  ERR " + res.statusCode + ": " + data.substring(0, 200));
      }
      if (idx % 25 === 0) {
        setTimeout(createNext, 12000);
      } else {
        setTimeout(createNext, 500);
      }
    });
  });
  req.on("error", (e) => { errors++; console.log("  NET ERR: " + e.message); setTimeout(createNext, 1000); });
  req.write(body);
  req.end();
}

console.log("Importing " + tickets.length + " tickets...");
createNext();
