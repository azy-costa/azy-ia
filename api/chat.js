export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const msg = req.body.message || "";

    // IA melhorada com detecção de idioma
    const reply = detectarResposta(msg);

    return res.status(200).json({ reply });
}

function detectarResposta(texto) {
    // identifica idioma básico
    const temAcentos = /[áéíóúãõâêîôûç]/i.test(texto);

    if (temAcentos || texto.match(/[^\u0000-\u007F]/)) {
        // PORTUGUÊS
        return `Eu entendi: "${texto}". 💖  
Sou a Azy IA e estou aqui para te ajudar no que precisar! `;
    }

    if (/hola|como estás|qué/i.test(texto)) {
        // ESPANHOL
        return `Entendí: "${texto}". 💖  
Soy Azy IA y estoy aquí para ayudarte en todo lo que necesites.`;
    }

    // INGLÊS OU QUALQUER OUTRA LÍNGUA
    return `I understood: "${texto}". 💖  
I am Azy AI, ready to assist you with anything you need!`;
}
