import React, { useState, useRef, useEffect } from 'react'
import { supabase, DailySummary } from '@/lib/supabase'
import { format } from 'date-fns'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  date: string
  dailyContext: { calories: number; protein: number; carbs: number; fat: number; trained: boolean; steps: number } | null
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

    // Save to DB
    await supabase.from('chat_history').insert({ date, role: 'user', content: userMsg.content })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dailyContext: dailyContext ? { ...dailyContext } : null,
        }),
      })
      const data = await res.json()
      const aiMsg: Message = { role: 'assistant', content: data.reply || 'No pude responder.' }
      setMessages(prev => [...prev, aiMsg])
      await supabase.from('chat_history').insert({ date, role: 'assistant', content: aiMsg.content })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error. Intentá de nuevo.' }])
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
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--green-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>🌿</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', color: 'var(--text-dark)' }}>
            Asistente Nutricional
          </div>
          <div style={{ fontSize: '11px', color: 'var(--green-sage)' }}>
            Recetas, macros, consultas, lo que quieras
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ whiteSpace: 'pre-wrap' }}>
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--green-pale)',
        display: 'flex',
        gap: '8px',
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
          ↑
        </button>
      </div>
    </div>
  )
}
