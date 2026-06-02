import { NextApiRequest, NextApiResponse } from 'next'
import { PLAN_CONTEXT } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { foodDescription, mealType, dailyContext } = req.body

  if (!foodDescription) return res.status(400).json({ error: 'Falta descripción de comida' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const prompt = `Analizá esta comida y devolvé SOLO un JSON válido sin markdown ni texto extra.

Comida registrada: "${foodDescription}"
Tipo de comida: ${mealType}

Devolvé exactamente este formato JSON:
{
  "description": "descripción normalizada de la comida",
  "calories": número,
  "protein": número en gramos,
  "carbs": número en gramos,
  "fat": número en gramos,
  "items": ["item1", "item2"]
}

Estimá los valores nutricionales lo más precisamente posible. Solo números, sin unidades dentro del JSON.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    
    // Clean and parse JSON
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    
    res.json(parsed)
  } catch (err) {
    console.error('Error analyzing food:', err)
    res.status(500).json({ error: 'Error al analizar la comida' })
  }
}
