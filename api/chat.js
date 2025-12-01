import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { message } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Mensagem não recebida" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini-instruct",
      messages: [
        {
          role: "system",
          content: "Você é a AZY IA, uma inteligência artificial feminina, realista, amigável e avançada."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content || "Erro ao gerar resposta.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno ao gerar resposta." });
  }
}
