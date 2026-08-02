// Serverless lead handler — emails enquiries via Resend.
// The API key lives ONLY in the RESEND_API_KEY env var, never in the repo.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const d = req.body || {};
  if (!d.name || !d.email) return res.status(400).json({ error: "missing_name_or_email" });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: "not_configured" });

  const to = process.env.LEAD_TO || "tsimmondsrosa@gmail.com";
  // Set LEAD_FROM to a sender on YOUR verified Resend domain (not the fleet one).
  const from = process.env.LEAD_FROM || "La Cour des Lavandes <onboarding@resend.dev>";

  const fields = ["name", "email", "country_code", "phone", "whatsapp_country_code", "whatsapp", "contact_time",
    "timescale", "mortgage", "message", "utm_source", "utm_medium",
    "utm_campaign", "utm_content", "utm_term"];
  const lines = fields.filter((k) => d[k]).map((k) => `${k}: ${d[k]}`).join("\n");

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to, reply_to: d.email,
      subject: `New enquiry — La Cour des Lavandes (${d.name})`,
      text: `A new enquiry came in from the website:\n\n${lines}\n`
    })
  });

  if (!r.ok) return res.status(502).json({ error: "send_failed", detail: await r.text() });
  return res.status(200).json({ ok: true });
}
