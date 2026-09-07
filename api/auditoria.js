export default async function handler(req, res) {
  // Damos permiso para que el HTML pueda comunicarse con este archivo
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se aceptan peticiones POST' });
  }

  try {
    // Recibimos las 3 urls de las fotos que manda el HTML
    const { foto_selfie, constancia_afip, cert_policial } = req.body;
    
    // Esta llave la vas a poner en el panel de Vercel
    const apiKey = process.env.OPENAI_API_KEY;

    // La orden estricta para la IA
    const promptAuditor = `Sos el Auditor de Seguridad Principal de 'Delivery Moto'. Tu trabajo es analizar 3 imágenes: Constancia de AFIP, Certificado de Buena Conducta (Policía) y una Selfie del cadete.
Reglas:
1. AFIP: Extraé Nombre Completo y CUIT/CUIL.
2. Buena Conducta: Extraé el Nombre Completo. Verificá que coincida EXACTAMENTE con el de AFIP.
3. Selfie: Verificá rostro humano visible, nítido y sin casco.
4. Veredicto: Si los nombres coinciden y los documentos son reales, aprobalo. Si hay fraude o no coinciden, rechazalo.
Respondé ÚNICAMENTE en formato JSON puro con esta estructura:
{"aprobado": true, "cuit": "20123456789", "nombre_real": "Juan Perez", "motivo": "Todo correcto"}`;

    // Nos conectamos a OpenAI
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptAuditor },
            { type: "image_url", image_url: { url: foto_selfie } },
            { type: "image_url", image_url: { url: constancia_afip } },
            { type: "image_url", image_url: { url: cert_policial } }
          ]
        }]
      })
    });

    const data = await openAiResponse.json();
    const veredicto = JSON.parse(data.choices[0].message.content);

    // Devolvemos la decisión de la IA al HTML
    return res.status(200).json(veredicto);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
