// Guarda y lista las confirmaciones de asistencia en Google Sheets (vía Apps Script)
const SHEETS_URL = process.env.SHEETS_URL;     // URL del Web App de Apps Script (termina en /exec)
const SHEETS_TOKEN = process.env.SHEETS_TOKEN; // misma clave que TOKEN en el Apps Script

async function sheets(method, payload) {
  const url = method === "GET"
    ? SHEETS_URL + "?token=" + encodeURIComponent(SHEETS_TOKEN)
    : SHEETS_URL;
  const r = await fetch(url, {
    method,
    redirect: "follow",
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? JSON.stringify({ ...payload, token: SHEETS_TOKEN }) : undefined,
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || "Error de Google Sheets");
  return d;
}

module.exports = async (req, res) => {
  if (!SHEETS_URL || !SHEETS_TOKEN) {
    return res.status(500).json({ error: "Falta configurar SHEETS_URL y SHEETS_TOKEN en Vercel." });
  }
  try {
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const nombre = String((body && body.nombre) || "").trim().slice(0, 60);
      if (nombre.length < 2) return res.status(400).json({ error: "Nombre inválido." });
      await sheets("POST", { nombre });
      return res.status(200).json({ ok: true });
    }
    if (req.method === "GET") {
      const clave = process.env.CLAVE_LISTA;
      if (!clave) return res.status(500).json({ error: "Falta configurar CLAVE_LISTA en Vercel." });
      if (req.query.clave !== clave) return res.status(401).json({ error: "Clave incorrecta." });
      const d = await sheets("GET");
      return res.status(200).json({ total: d.lista.length, lista: d.lista });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "No se pudo acceder a Google Sheets." });
  }
};
