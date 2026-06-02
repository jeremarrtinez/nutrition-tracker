import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type FoodLog = {
  id?: string
  date: string
  meal_type: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack'
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  raw_input: string
  created_at?: string
}

export type DailySummary = {
  id?: string
  date: string
  trained: boolean
  steps: number
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  notes: string
  created_at?: string
  updated_at?: string
}

export type ChatMessage = {
  id?: string
  date: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}
