// api/chat.js - Vercel Serverless (Node)
import formidable from "formidable";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function parseForm(req){
  const form = formidable({ multiples:false });
  return new Promise((resolve,reject)=> form.parse(req,(err,fields,files)=> err?reject(err):resolve({fields,files})));
}

function detectBlocked(text){
  if(!text) return false;
  const lower = text.toLowerCase();
  const blocked = ["impersonate","imitate","celebrity","donald trump","rihanna","michael jackson"];
  for(const b of blocked) if(lower.includes(b)) return true;
  return false;
}

// === PROVIDER STUBS: substituir pelos calls reais ===
async function callTextModel(prompt, lang){
  // TODO: call your OpenAI/other chat model using OPENAI_API_KEY
  // Example: use fetch to OpenAI ChatCompletions or your Supabase "cerebro" content
  if(supabase){
    // Exemplo simples: buscar resposta pré-treinada no supabase (sua lógica)
    try {
      const { data } = await supabase.from('responses').select('reply').ilike('trigger', `%${prompt}%`).limit(1);
      if(data && data.length) return data[0].reply;
    } catch(e){}
  }
  return `Azy IA (simulada) respondeu: "${prompt}"`;
}

async function callImageModel(prompt, fileBuffer){
  // TODO: call image API (OpenAI images, Pika, Stable Diffusion)
  return { imageUrl: "https://via.placeholder.com/640x360.png?text=Imagem+Simulada" };
}

async function callVideoModel(prompt, fileBuffer){
  // TODO: call video provider (Runway/Pika/etc.)
  return { videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4" };
}

async function callTTS(text, voice){
  // TODO: ElevenLabs or other TTS provider
  return { ttsUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" };
}

// === handler ===
export default async function handler(req,res){
  try{
    if(req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    const { fields, files } = await parseForm(req);
    const payload = JSON.parse(fields.payload || "{}");
    const action = payload.action || "chat";
    const message = (payload.message || "").toString();
    const lang = payload.lang || "auto";
    const voice = payload.voice || "neutral";

    if(detectBlocked(message)) return res.status(400).json({ error: "Pedido bloqueado por política de segurança." });

    let fileBuffer = null;
    if(files.file && files.file.filepath) fileBuffer = await fs.readFile(files.file.filepath);

    if(action === "chat"){
      const reply = await callTextModel(message, lang);
      return res.status(200).json({ reply });
    }

    if(action === "image"){
      const out = await callImageModel(message, fileBuffer);
      return res.status(200).json({ reply: "Imagem gerada", ...out });
    }

    if(action === "video"){
      const out = await callVideoModel(message, fileBuffer);
      return res.status(200).json({ reply: "Vídeo gerado", ...out });
    }

    if(action === "tts"){
      const out = await callTTS(message, voice);
      return res.status(200).json({ reply: "Áudio TTS pronto", ...out });
    }

    return res.status(400).json({ error: "Ação desconhecida" });

  } catch(err){
    console.error(err);
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
