// /api/auditoria.js
export default async function handler(req, res) {
  // 1. Cabeceras CORS obligatorias para que el HTML pueda hablar con esta API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Respuesta rápida a las peticiones OPTIONS (Pre-flight de los navegadores)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se aceptan peticiones POST' });
  }

  try {
    // Recibimos las 3 urls de las fotos que manda el HTML (Frontend)
    const { foto_selfie, constancia_afip, cert_policial } = req.body;
    
    // Validamos que lleguen las 3 imágenes
    if (!foto_selfie || !constancia_afip || !cert_policial) {
      return res.status(400).json({ error: "Faltan imágenes para la auditoría." });
    }
    
    // Esta llave la tenés configurada en las Variables de Entorno de Vercel
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "No se configuró la API KEY de OpenAI en el servidor." });
    }

    // La orden estricta para la IA
    const promptAuditor = `Sos el Auditor de Seguridad Principal de 'Delivery Moto'. Tu trabajo es analizar 3 imágenes: Constancia de AFIP, Certificado de Buena Conducta (Policía) y una Selfie del cadete.
Reglas:
1. AFIP: Extraé Nombre Completo y CUIT/CUIL.
2. Buena Conducta: Extraé el Nombre Completo. Verificá que coincida EXACTAMENTE con el de AFIP.
3. Selfie: Verificá rostro humano visible, nítido y sin casco.
4. Veredicto: Si los nombres coinciden y los documentos son reales, aprobalo. Si hay fraude o no coinciden, rechazalo.
Respondé ÚNICAMENTE en formato JSON puro con esta estructura, sin texto extra, sin markdown:
{"aprobado": true, "cuit": "20123456789", "nombre_real": "Juan Perez", "motivo": "Todo correcto"}`;

    // Nos conectamos a OpenAI con el formato CORRECTO para Vision
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // Modelo que entiende imágenes
        response_format: { type: "json_object" }, // Obligamos a que devuelva un JSON
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

    if (!openAiResponse.ok) {
        const errorData = await openAiResponse.json();
        console.error("Error de OpenAI:", errorData);
        throw new Error("Fallo la comunicación con OpenAI");
    }

    const data = await openAiResponse.json();
    
    // Parseamos el JSON que nos devuelve GPT
    const veredicto = JSON.parse(data.choices[0].message.content);

    // Devolvemos la decisión de la IA al HTML
    return res.status(200).json(veredicto);

  } catch (error) {
    console.error("Error general en el Handler:", error);
    return res.status(500).json({ error: error.message, aprobado: false, motivo: "Error interno del servidor al procesar las imágenes." });
  }
}
