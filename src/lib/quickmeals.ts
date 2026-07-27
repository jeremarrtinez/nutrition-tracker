// Platos predeterminados — editá esta lista a tu gusto
// Cada vez que agregues uno nuevo acá, aparece automáticamente en la app

export interface QuickMeal {
  id: string
  name: string
  emoji: string
  meal_type: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
}

export const QUICK_MEALS: QuickMeal[] = [
  {
    id: 'proteina-scoop',
    name: 'Scoop de proteína',
    emoji: '🥤',
    meal_type: 'desayuno',
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 2,
    description: '1 scoop proteína en agua',
  },
  {
    id: 'sandwich-jamon-queso',
    name: 'Sandwich jamón y queso',
    emoji: '🥪',
    meal_type: 'almuerzo',
    calories: 265,
    protein: 20,
    carbs: 28,
    fat: 8,
    description: '2 rebanadas pan integral + 2 fetas jamón cocido + 1 porción queso port salut light',
  },
  {
    id: 'granola-yogur',
    name: 'Granola + yogur',
    emoji: '🥣',
    meal_type: 'desayuno',
    calories: 255,
    protein: 13,
    carbs: 40,
    fat: 6,
    description: '4 cdas granola + 150g yogur descremado',
  },
  {
    id: 'tostadas-huevo-jamon',
    name: '2 tostadas + huevo + jamón',
    emoji: '🍳',
    meal_type: 'desayuno',
    calories: 320,
    protein: 22,
    carbs: 26,
    fat: 13,
    description: '2 tostadas integrales + 2 huevos revueltos + 2 fetas jamón',
  },
  {
    id: 'cafe-con-leche',
    name: 'Café con leche',
    emoji: '☕',
    meal_type: 'desayuno',
    calories: 120,
    protein: 7,
    carbs: 10,
    fat: 6,
    description: 'Café con leche (200ml leche entera)',
  },
  {
    id: 'pollo-arroz',
    name: 'Pollo + arroz',
    emoji: '🍗',
    meal_type: 'almuerzo',
    calories: 360,
    protein: 35,
    carbs: 43,
    fat: 4,
    description: '200g pechuga de pollo a la plancha + 150g arroz cocido',
  },
  {
    id: 'carne-papa',
    name: 'Carne + papa',
    emoji: '🥩',
    meal_type: 'almuerzo',
    calories: 430,
    protein: 30,
    carbs: 30,
    fat: 8,
    description: '200g carne vacuna magra a la plancha + 1 papa mediana hervida',
  },
  {
    id: 'fruta',
    name: 'Fruta',
    emoji: '🍎',
    meal_type: 'merienda',
    calories: 80,
    protein: 1,
    carbs: 20,
    fat: 0,
    description: '1 fruta mediana',
  },
  {
    id: 'frutos-secos',
    name: 'Frutos secos',
    emoji: '🥜',
    meal_type: 'snack',
    calories: 155,
    protein: 4,
    carbs: 4,
    fat: 14,
    description: '25g frutos secos (nueces/almendras)',
  },
]
