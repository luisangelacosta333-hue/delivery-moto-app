// /api/pago.js
export default async function handler(req, res) {
  // 1. Cabeceras CORS de seguridad (Obligatorio para Vercel)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se aceptan peticiones POST' });
  }

  try {
    const { comprobante_url, monto_esperado } = req.body;
    
    if (!comprobante_url || monto_esperado === undefined) {
      return res.status(400).json({ error: "Faltan datos del comprobante o el monto esperado." });
    }
    
    const apiKey = process.env.OPENAI_API_KEY;

    // Orden estricta para la IA
    const promptPago = `Sos un auditor contable automatizado de 'Delivery Moto'. Tu trabajo es leer el comprobante de transferencia (Mercado Pago o Banco) en la imagen.
Reglas:
1. Verificá si la imagen es realmente un comprobante de pago exitoso.
2. Buscá el MONTO TOTAL transferido.
3. El cadete debe exactamente $${monto_esperado}. Verificá si el monto del comprobante es igual o mayor a esta deuda.
Respondé ÚNICAMENTE en formato JSON puro con esta estructura (sin texto extra):
{"pago_valido": true, "monto_leido": 600, "motivo": "Transferencia exitosa detectada por el monto correcto"}`;

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
            { type: "text", text: promptPago },
            { type: "image_url", image_url: { url: comprobante_url } }
          ]
        }]
      })
    });

    if (!openAiResponse.ok) throw new Error("Fallo la comunicación con OpenAI");

    const data = await openAiResponse.json();
    const veredicto = JSON.parse(data.choices[0].message.content);

    return res.status(200).json(veredicto);

  } catch (error) {
    console.error("Error en Pago:", error);
    return res.status(500).json({ pago_valido: false, motivo: "Error interno procesando el comprobante." });
  }
}
