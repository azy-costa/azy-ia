// api/chat.js (Vercel serverless function)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // receber mensagem do frontend
    const body = req.body && Object.keys(req.body).length ? req.body : await req.json();
    const { message } = body;
    if (!message) return res.status(400).json({ error: "Mensagem não recebida" });

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da OpenAI não configurada (OPENAI_API_KEY)" });
    }

    // Chamada para a API da OpenAI (Chat Completions)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: message }],
        max_tokens: 800
      })
    });

    const data = await response.json();

    const reply = data?.choices?.[0]?.message?.content ?? "Sem resposta.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Erro ao conectar à OpenAI: " + (error.message || error) });
  }
}
