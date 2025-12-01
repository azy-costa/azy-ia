// api/chat.js
// Vercel serverless handler (Node / ESM style)
// Requer: SUPABASE_URL, SUPABASE_ANON_KEY (opcional), OPENAI_API_KEY (opcional)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// simples proteção básica: bloqueia pedidos de "imitar celebridade"
function isBlocked(text = "") {
  const lower = text.toLowerCase();
  const blocked = ["imitate", "impersonate", "celebrity", "donald trump", "rihanna", "michael jackson"];
  return blocked.some(b => lower.includes(b));
}

async function callOpenAI(message, model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Você é Azy IA — assistente amigável, útil, educada e segura." },
        { role: "user", content: message }
      ],
      temperature: 0.8,
      max_tokens: 800
    })
  });
  const json = await resp.json();
  if (json?.error) throw new Error(json.error.message || "OpenAI erro");
  const reply = json.choices?.[0]?.message?.content || JSON.stringify(json);
  return reply;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    // se o body for multipart/form-data (ex: upload), Git detecta diferente.
    // Aqui assumimos JSON simples do cliente. Se seu client usar FormData,
    // trocamos a leitura (mas o front do index.html usa FormData para arquivos).
    const contentType = req.headers["content-type"] || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = req.body || {};
    } else {
      // Vercel já faz body parsing; se estiver usando FormData no cliente,
      // o body virá como text, então tentamos parse manual (fallback).
      try {
        const text = await new Promise((r) => {
          let s = "";
          req.on("data", (chunk) => (s += chunk));
          req.on("end", () => r(s));
        });
        payload = JSON.parse(text || "{}");
      } catch {
        payload = {};
      }
    }

    const message = (payload.message || payload.msg || "").toString();
    const action = (payload.action || "chat").toString(); // chat|image|video|tts

    if (!message && action === "chat") {
      return res.status(400).json({ error: "Mensagem vazia" });
    }

    if (isBlocked(message)) {
      return res.status(400).json({ error: "Pedido bloqueado por política de segurança (imitação/celebridade)." });
    }

    // 1) Primeiro: tentar resposta do "cérebro" no Supabase (se configurado)
    if (supabase) {
      try {
        // Exemplo: tabela `responses` com colunas `trigger` (texto) e `reply` (resposta)
        const { data, error } = await supabase
          .from("responses")
          .select("reply")
          .ilike("trigger", `%${message}%`)
          .limit(1);

        if (!error && data && data.length > 0) {
          return res.status(200).json({ reply: data[0].reply, source: "supabase" });
        }
      } catch (e) {
        // se supabase falhar, apenas seguimos para OpenAI (não interrompe)
        console.warn("Supabase lookup failed:", e.message || e);
      }
    }

    // 2) Se não encontrou no Supabase, vamos ao modelo de texto (OpenAI) se disponível
    if (process.env.OPENAI_API_KEY) {
      try {
        const reply = await callOpenAI(message);
        return res.status(200).json({ reply, source: "openai" });
      } catch (e) {
        console.warn("OpenAI call failed:", e.message || e);
        // fallback textual simples
        return res.status(200).json({ reply: `Azy IA: recebi sua mensagem: "${message}" (modo fallback)`, source: "fallback" });
      }
    }

    // 3) fallback final (sem OpenAI configurado)
    return res.status(200).json({ reply: `Azy IA (offline): recebi sua mensagem: "${message}". Configure OPENAI_API_KEY para respostas avançadas.` });

  } catch (err) {
    console.error("api/chat error:", err);
    return res.status(500).json({ error: "Erro interno no servidor", detail: err.message });
  }
}
