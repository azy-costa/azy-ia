// api/chat.js  (Next.js serverless)
// usa SDK "openai" (import OpenAI from "openai")
import OpenAI from "openai";

export default async function handler(req, res) {
  // só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido (use POST)" });
  }

  try {
    // ler body com segurança
    // quando deployments como Vercel/Edge podem enviar body já parseado
    const body = req.body && Object.keys(req.body).length ? req.body : await req.json().catch(() => ({}));
    const message = body?.message;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Mensagem não recebida" });
    }

    // pegar chave e modelo das variáveis de ambiente
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini-instruct";

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da OpenAI não configurada (OPENAI_API_KEY)" });
    }

    // cria cliente
    const client = new OpenAI({ apiKey });

    // chama a API de chat completions
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Você é a AZY IA, uma assistente feminina, educada e inteligente." },
        { role: "user", content: String(message) }
      ],
      // ajuste se quiser limite de tokens
      max_tokens: 800
    });

    // extrai resposta
    const reply = completion?.choices?.[0]?.message?.content ?? null;

    if (!reply) {
      // se não veio texto, retorna erro com detalhes mínimos
      console.error("OpenAI response without reply:", JSON.stringify(completion));
      return res.status(500).json({ error: "Sem resposta da OpenAI", raw: completion ? "no-text" : "no-completion" });
    }

    // sucesso
    return res.status(200).json({ reply });
  } catch (err) {
    // log para Vercel (vai aparecer em Logs)
    console.error("API /api/chat error:", err);
    // responde cliente com mensagem de erro curta
    return res.status(500).json({ error: "Erro interno ao gerar resposta", details: err?.message ?? String(err) });
  }
}
