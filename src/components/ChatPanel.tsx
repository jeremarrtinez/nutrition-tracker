import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  date: string
  dailyContext: {
    calories: number
    protein: number
    carbs: number
    fat: number
    trained: boolean
    steps: number
    logs?: { meal_type: string; description: string; calories: number; protein: number; carbs: number; fat: number }[]
  } | null
}

export default function ChatPanel({ date, dailyContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola Jere! 🌿 Soy tu asistente nutricional. Podés preguntarme sobre recetas, consultar tus macros, pedirme que analice si podés comer algo, ¡lo que quieras!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      await supabase.from('chat_history').insert({
        date, role: 'user', content: userMsg.content
      })

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dailyContext,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || `Error ${res.status}`)
      }

      const aiMsg: Message = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, aiMsg])

      await supabase.from('chat_history').insert({
        date, role: 'assistant', content: aiMsg.content
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      setMessages(prev => prev.filter((_, i) => i < prev.length))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--green-pale)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--green-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🌿</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-dark)' }}>
            Asistente Nutricional
          </div>
          <div style={{ fontSize: 11, color: 'var(--green-sage)' }}>
            {dailyContext?.logs && dailyContext.logs.length > 0
              ? `${dailyContext.logs.length} comidas registradas hoy`
              : 'Sin comidas registradas hoy'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
              style={{ whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="chat-bubble-ai">
              <span className="loading-dots"><span/><span/><span/></span>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 12px', background: '#fee2e2', borderRadius: 8,
            fontSize: 12, color: '#dc2626', textAlign: 'center',
          }}>
            ⚠️ {error} — intentá de nuevo
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--green-pale)',
        display: 'flex', gap: 8,
      }}>
        <input
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Preguntame algo... ej: ¿puedo comer pizza esta noche?"
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ minWidth: 70 }}
        >
          {loading ? '...' : '↑'}
        </button>
      </div>
    </div>
  )
}
