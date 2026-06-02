# 🌿 Emilia — Tracker Nutricional

App personal para tracking nutricional diario con IA integrada.

## Features

- 📊 Seguimiento diario de calorías, proteínas, carbos y grasas
- 🤖 Análisis de comidas con IA (escribís en lenguaje natural)
- ✨ Recomendaciones de qué comer según lo que ya registraste
- 💪 Registro de entrenamiento y pasos (con cálculo de calorías extra)
- 💬 Chat con asistente nutricional IA
- 📅 Resúmenes semanales y mensuales con gráficos

## Setup

### 1. Variables de entorno

Renombrá `.env.example` a `.env.local` y completá:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
ANTHROPIC_API_KEY=tu_api_key_anthropic
```

Para obtener tu Anthropic API Key: https://console.anthropic.com

### 2. Personalizar el plan nutricional

Editá `src/lib/plan.ts`:
- `DAILY_PLAN`: calorías y macros diarios según el plan de tu nutricionista
- `FOOD_RESTRICTIONS`: restricciones específicas (ej: máx 2 huevos)

### 3. Instalar dependencias

```bash
npm install
```

### 4. Correr en desarrollo

```bash
npm run dev
```

### 5. Deploy en Vercel

1. Subí el código a GitHub
2. Conectá el repo en vercel.com
3. Agregá las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy! 🚀

## Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **IA**: Claude API (Anthropic)
- **Gráficos**: Recharts
- **Deploy**: Vercel
