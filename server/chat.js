// server/chat.js  (Vercel serverless handler)
import formidable from "formidable";
import fs from "fs/promises";

/**
 * Observações:
 * - Este handler aceita POST multipart/form-data com:
 *    - "payload": JSON contendo { action, message, lang, voice }
 *    - "file": optional imagens/vídeo para edição/uso.
 * - Actions suportadas: "chat", "image", "video", "tts", "edit"
 * - Atualmente as chamadas a provedores (OpenAI, ElevenLabs, Runway, etc.)
 *   estão como stubs: substitua pelos seus endpoints/SDKs.
 *
 * Variáveis de ambiente (adicionar no Vercel):
 * - OPENAI_API_KEY
 * - ELEVEN_API_KEY
 * - RUNWAY_API_KEY (ou PIKA_API_KEY, etc.)
 * - SUPABASE_URL, SUPABASE_ANON_KEY (se usar supabase)
 *
 * Segurança: bloqueia pedidos de deepfake/celebridade automaticamente (cheque e melhore as regras).
 */

// ---------- helpers ----------
async function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function detectProhibited(text) {
  if (!text) return false;
  const lowered = text.toLowerCase();
  // regras simples: impedir solicitações de "imitar [celebridade]" ou "usar voz de [nome]"
  const black = ["imitate", "impersonate", "celebrity", "donald trump", "rihanna", "michael jackson"];
  for (const b of black) if (lowered.includes(b)) return true;
  return false;
}

// ---------- provider stubs (substituir pelos SDKs reais) ----------
async function callTextModel(prompt, lang) {
  // TODO: substituir por chamada real OpenAI / outro
  // Exemplo: fetch("https://api.openai.com/v1/chat/completions", { headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`}, body: {...}})
  return `Azy IA (simulada) respondeu: "${prompt}" (detected lang=${lang})`;
}

async function callImageModel(prompt, fileBuffer) {
  // TODO: chamar API de imagem (ex.: OpenAI images, Pika, Stable Diffusion inference)
  // Retornar { imageUrl: "https://..." } ou { imageBase64: "..." }
  return { imageUrl: "https://via.placeholder.com/640x360.png?text=Imagem+Simulada" };
}

async function callVideoModel(prompt, fileBuffer) {
  // TODO: chamar API de geração de vídeo (Runway, Pika, Synthesia-like)
  return { videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4" };
}

async function callTTS(text, voice) {
  // TODO: ElevenLabs / Azure TTS / Google Cloud TTS
  // Deve retornar uma URL pública ou base64
  return { ttsUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" };
}

// ---------- handler ----------
export const config = {
  api: { bodyParser: false } // necessário para multipart/form-data
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    const { fields, files } = await parseForm(req);
    const payload = JSON.parse(fields.payload || "{}");
    const action = payload.action || "chat";
    const message = (payload.message || "").toString();
    const lang = payload.lang || "auto";
    const voice = payload.voice || "neutral";

    // check basic safety: no deepfake/celebrity impersonation
    if (detectProhibited(message)) {
      return res.status(400).json({ error: "Pedido bloqueado: conteúdo de impersonação/celebridade não permitido." });
    }

    // optional file buffer
    let fileBuffer = null;
    if (files.file && files.file.filepath) {
      fileBuffer = await fs.readFile(files.file.filepath);
    }

    if (action === "chat") {
      const reply = await callTextModel(message, lang);
      return res.status(200).json({ reply });
    }

    if (action === "image") {
      const out = await callImageModel(message, fileBuffer);
      return res.status(200).json({ reply: "Imagem gerada", ...out });
    }

    if (action === "video") {
      const out = await callVideoModel(message, fileBuffer);
      return res.status(200).json({ reply: "Vídeo gerado", ...out });
    }

    if (action === "tts") {
      const out = await callTTS(message, voice);
      return res.status(200).json({ reply: "Áudio TTS pronto", ...out });
    }

    return res.status(400).json({ error: "Ação desconhecida" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
