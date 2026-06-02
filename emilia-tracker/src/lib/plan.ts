// Plan nutricional de Emilia
// Modifica estos valores según el plan de tu nutricionista

export const DAILY_PLAN = {
  calories: 1800,
  protein: 120,   // gramos
  carbs: 180,     // gramos
  fat: 60,        // gramos
  fiber: 25,      // gramos (referencia)
}

// Distribución por comida (porcentaje del total diario)
export const MEAL_DISTRIBUTION = {
  desayuno: { calories: 0.25, label: 'Desayuno', emoji: '🌅', time: '7:00 - 9:00' },
  almuerzo: { calories: 0.35, label: 'Almuerzo', emoji: '☀️', time: '12:00 - 14:00' },
  merienda: { calories: 0.15, label: 'Merienda', emoji: '🍎', time: '16:00 - 17:00' },
  cena:     { calories: 0.20, label: 'Cena',     emoji: '🌙', time: '19:00 - 21:00' },
  snack:    { calories: 0.05, label: 'Snack',    emoji: '🥜', time: 'Cualquier momento' },
}

// Restricciones específicas del plan (personalizar según indicación del nutricionista)
export const FOOD_RESTRICTIONS = {
  // Ejemplo: máximo 2 huevos por día
  // Agregar aquí las restricciones del plan de Emilia
  huevos: { maxPerDay: 2, unit: 'unidades' },
}

// Calorías extras por actividad
export const ACTIVITY_CALORIES = {
  training: 300,      // calorías extras si entrenó
  stepsBase: 2000,    // pasos base (sin beneficio)
  caloriesPerStep: 0.04, // aprox calorías por paso sobre el base
}

// Contexto del plan para la IA
export const PLAN_CONTEXT = `
Eres el asistente nutricional personal de Emilia. Su plan diario es:
- Calorías: ${DAILY_PLAN.calories} kcal
- Proteínas: ${DAILY_PLAN.protein}g
- Carbohidratos: ${DAILY_PLAN.carbs}g
- Grasas: ${DAILY_PLAN.fat}g

Restricciones importantes:
- Máximo 2 huevos por día

Distribución de comidas:
- Desayuno: ~${Math.round(DAILY_PLAN.calories * 0.25)} kcal (25%)
- Almuerzo: ~${Math.round(DAILY_PLAN.calories * 0.35)} kcal (35%)
- Merienda: ~${Math.round(DAILY_PLAN.calories * 0.15)} kcal (15%)
- Cena: ~${Math.round(DAILY_PLAN.calories * 0.20)} kcal (20%)

Cuando respondas sobre recomendaciones de comida, siempre considerá:
1. Lo que ya comió en el día
2. Los macronutrientes restantes disponibles
3. Las restricciones del plan
4. Que las sugerencias sean realistas, prácticas y sabrosas
5. Usá español rioplatense (vos, comés, etc.)

Para recetas, dá instrucciones claras y simples. Siempre incluí los macros aproximados.
`
