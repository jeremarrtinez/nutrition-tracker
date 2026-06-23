import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { foodDescription, mealType } = req.body
  if (!foodDescription) return res.status(400).json({ error: 'Falta descripción de comida' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const prompt = `Sos un nutricionista experto. Analizá esta comida y calculá sus valores nutricionales con la mayor precisión posible.

Comida: "${foodDescription}"
Tipo de comida: ${mealType}

REGLAS ESTRICTAS:
- Usá valores nutricionales estándar reales, no aproximaciones genéricas
- Si hay cantidades específicas (ej: "2 huevos"), calculá exactamente eso
- Si no hay cantidad, asumí una porción estándar habitual en Argentina
- NO sobreestimes ni subestimes — sé preciso

VALORES DE REFERENCIA:
- 1 huevo grande: 70 kcal, 6g prot, 0.5g carb, 5g grasa
- 100g pechuga de pollo a la plancha: 165 kcal, 31g prot, 0g carb, 3.6g grasa
- 100g carne vacuna magra: 180 kcal, 26g prot, 0g carb, 8g grasa
- 1 tostada integral (25g): 65 kcal, 2.5g prot, 12g carb, 1g grasa
- 1 taza leche entera (250ml): 150 kcal, 8g prot, 12g carb, 8g grasa
- 1 taza leche descremada (250ml): 85 kcal, 8g prot, 12g carb, 0.5g grasa
- Café solo (sin azúcar): 5 kcal, 0g prot, 0g carb, 0g grasa
- Café con leche (200ml leche): 120 kcal, 7g prot, 10g carb, 6g grasa
- 1 porción queso port salut light (30g): 80 kcal, 7g prot, 0.5g carb, 5.5g grasa
- 2 fetas jamón cocido (30g): 45 kcal, 7g prot, 1g carb, 1.5g grasa
- 1 cda aceite (10ml): 90 kcal, 0g prot, 0g carb, 10g grasa
- 1/2 palta mediana (70g): 112 kcal, 1g prot, 3g carb, 10g grasa
- 150g arroz cocido: 195 kcal, 4g prot, 43g carb, 0.5g grasa
- 150g fideos cocidos: 220 kcal, 7g prot, 44g carb, 1g grasa
- 1 papa mediana hervida (150g): 130 kcal, 3g prot, 30g carb, 0g grasa
- 1 fruta mediana (manzana/naranja/banana): 80 kcal, 1g prot, 20g carb, 0g grasa
- 150g yogur descremado: 85 kcal, 9g prot, 12g carb, 0g grasa
- 4 cdas granola (40g): 170 kcal, 4g prot, 28g carb, 6g grasa
- 25g frutos secos (nueces/almendras): 155 kcal, 4g prot, 4g carb, 14g grasa
- 1 cda mantequilla maní (15g): 90 kcal, 3.5g prot, 3g carb, 8g grasa
- 100g lenteja/garbanzo cocido: 115 kcal, 9g prot, 20g carb, 0.5g grasa
- Pan integral 1 rebanada (30g): 75 kcal, 3g prot, 14g carb, 1g grasa
- 1 taza avena (80g): 290 kcal, 11g prot, 54g carb, 5g grasa

Si la comida tiene ingredientes combinados, sumá cada componente por separado y luego dá el total.

Devolvé SOLO este JSON sin markdown ni texto extra:
{
  "description": "descripción normalizada clara y breve",
  "calories": número entero,
  "protein": número con 1 decimal,
  "carbs": número con 1 decimal,
  "fat": número con 1 decimal,
  "breakdown": "detalle de cómo calculaste"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Anthropic API error:', response.status, errBody)
      return res.status(500).json({ error: `Anthropic error ${response.status}: ${errBody}` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text

    if (!text) {
      console.error('Empty response:', JSON.stringify(data))
      return res.status(500).json({ error: 'Respuesta vacía de la IA' })
    }

    const clean = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error('JSON parse error. Raw:', text)
      return res.status(500).json({ error: 'La IA no devolvió JSON válido', raw: text })
    }

    res.json(parsed)
  } catch (err) {
    console.error('Fetch error:', err)
    res.status(500).json({ error: String(err) })
  }
}
