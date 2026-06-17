import { NextApiRequest, NextApiResponse } from 'next'
import { PLAN_CONTEXT, DAILY_PLAN } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, dailyContext } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const logsDetalle = dailyContext?.logs && dailyContext.logs.length > 0
    ? dailyContext.logs.map((l: {
        meal_type: string; description: string
        calories: number; protein: number; carbs: number; fat: number
      }) =>
        `  • [${l.meal_type}] ${l.description} → ${Math.round(l.calories)} kcal | P: ${l.protein.toFixed(1)}g | C: ${l.carbs.toFixed(1)}g | G: ${l.fat.toFixed(1)}g`
      ).join('\n')
    : '  (ninguna comida registrada aún hoy)'

  const systemPrompt = `${PLAN_CONTEXT}

════════════════════════════════════════
LO QUE JERE COMIÓ HOY (DATOS REALES)
════════════════════════════════════════
${logsDetalle}

TOTALES DEL DÍA:
- Calorías: ${dailyContext?.calories?.toFixed(0) || 0} / ~${DAILY_PLAN.calories} kcal
- Proteínas: ${dailyContext?.protein?.toFixed(1) || 0} / ~${DAILY_PLAN.protein}g
- Carbohidratos: ${dailyContext?.carbs?.toFixed(1) || 0} / ~${DAILY_PLAN.carbs}g
- Grasas: ${dailyContext?.fat?.toFixed(1) || 0} / ~${DAILY_PLAN.fat}g
- Entrenó hoy: ${dailyContext?.trained ? 'Sí' : 'No'}
- Pasos: ${dailyContext?.steps || 0}

INSTRUCCIÓN CRÍTICA:
Solo podés hacer referencia a comidas que aparezcan EXACTAMENTE en la lista de arriba.
Si no hay datos, decí que no hay nada registrado aún.
NUNCA inventes comidas que no estén en esa lista.`

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
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Anthropic error:', response.status, errBody)
      return res.status(500).json({ error: `Error ${response.status}: ${errBody}` })
    }

    const data = await response.json()

    if (data.error) {
      console.error('Anthropic API returned error:', data.error)
      return res.status(500).json({ error: data.error.message || 'Error de la API' })
    }

    const text = data.content?.[0]?.text

    if (!text) {
      console.error('No text in response:', JSON.stringify(data))
      return res.status(500).json({ error: 'Respuesta vacía' })
    }

    res.json({ reply: text })
  } catch (err) {
    console.error('Chat fetch error:', err)
    res.status(500).json({ error: String(err) })
  }
}
