// pages/api/chat.js (Next.js serverless)
export default async function handler(req, res) {
  // só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido (use POST)" });
  }

  try {
    // pegar body de forma segura (GitHub/edge + body parsing)
    const body = req.body && Object.keys(req.body).length ? req.body : await req.json?.() || {};
    const { message, userId } = body; // message obrigatório. userId opcional (p/ histórico)

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Mensagem não recebida" });
    }

    // chave e modelo
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da OpenAI não configurada (OPENAI_API_KEY)" });
    }

    // --- OPCIONAL: buscar contexto do Supabase (se configurado) ---
    let systemContext = ""; // texto que vamos concatenar ao prompt (se houver)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Ex.: tabela 'brain' com coluna 'content' e 'created_at'
        const supaRes = await fetch(
          `${SUPABASE_URL}/rest/v1/brain?select=content&order=created_at.desc&limit=5`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (supaRes.ok) {
          const rows = await supaRes.json();
          // monta contexto (os itens mais recentes primeiro)
          if (Array.isArray(rows) && rows.length) {
            systemContext = rows.map(r => r.content).join("\n\n");
            // limitar tamanho do contexto se quiser (evitar estourar tokens)
            if (systemContext.length > 3000) {
              systemContext = systemContext.slice(0, 3000);
            }
          }
        }
      } catch (err) {
        // se Supabase der erro, não trava a API — só segue sem contexto
        console.warn("Erro ao buscar Supabase:", err?.message || err);
      }
    }

    // --- Monta mensagens para a API da OpenAI (chat completions) ---
    // Inserimos um system prompt com contexto (se existir).
    const messages = [];
    if (systemContext) {
      messages.push({
        role: "system",
        content: `Contexto do banco: ${systemContext}`,
      });
    }

    // mensagem do usuário
    messages.push({
      role: "user",
      content: String(message),
    });

    // Faz a chamada ao endpoint Chat Completions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.2,
        // presence_penalty: 0,
        // frequency_penalty: 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return res.status(502).json({ error: "Erro ao conectar com a OpenAI", details: text });
    }

    const data = await response.json();

    // extrai resposta de forma segura
    const reply = data?.choices?.[0]?.message?.content ?? "Sem resposta.";

    // retorna resposta para o front
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: "Erro interno no servidor", details: String(error) });
  }
}
