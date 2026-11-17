// Guarda y lista las confirmaciones de asistencia (Upstash Redis vía REST)
const URL_DB = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(URL_DB, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || "Error de base de datos");
  return d.result;
}

module.exports = async (req, res) => {
  if (!URL_DB || !TOKEN) {
    return res.status(500).json({ error: "Falta conectar la base de datos (Upstash Redis) en Vercel." });
  }
  try {
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const nombre = String((body && body.nombre) || "").trim().slice(0, 60);
      if (nombre.length < 2) return res.status(400).json({ error: "Nombre inválido." });
      await redis(["RPUSH", "rsvp", JSON.stringify({ nombre, fecha: new Date().toISOString() })]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "GET") {
      const clave = process.env.CLAVE_LISTA;
      if (!clave) return res.status(500).json({ error: "Falta configurar CLAVE_LISTA en Vercel." });
      if (req.query.clave !== clave) return res.status(401).json({ error: "Clave incorrecta." });
      const items = (await redis(["LRANGE", "rsvp", "0", "-1"])) || [];
      const lista = items
        .map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
        .filter(Boolean);
      return res.status(200).json({ total: lista.length, lista });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "No se pudo acceder a la base de datos." });
  }
};
