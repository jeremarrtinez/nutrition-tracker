import { NextApiRequest, NextApiResponse } from 'next'
import { PLAN_CONTEXT, DAILY_PLAN } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, dailyContext } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const systemPrompt = `${PLAN_CONTEXT}

Contexto del día actual:
${dailyContext ? `
- Calorías consumidas: ${dailyContext.calories?.toFixed(0) || 0}/${DAILY_PLAN.calories} kcal
- Proteínas: ${dailyContext.protein?.toFixed(1) || 0}/${DAILY_PLAN.protein}g
- Carbohidratos: ${dailyContext.carbs?.toFixed(1) || 0}/${DAILY_PLAN.carbs}g
- Grasas: ${dailyContext.fat?.toFixed(1) || 0}/${DAILY_PLAN.fat}g
- Entrenó: ${dailyContext.trained ? 'Sí' : 'No'}
- Pasos: ${dailyContext.steps || 0}
` : 'Sin datos del día disponibles aún.'}

Respondé de manera conversacional, amigable y útil. Si te piden recetas, dá los macros aproximados. Usá español rioplatense.`

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
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || 'No pude generar una respuesta.'
    res.json({ reply: text })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Error en el chat' })
  }
}
