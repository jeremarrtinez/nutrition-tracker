/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        sage: {
          50: '#f4f7f4',
          100: '#e3ebe3',
          200: '#c8d9c8',
          300: '#a0bea0',
          400: '#739d73',
          500: '#527e52',
          600: '#3d6340',
          700: '#324f35',
          800: '#29402c',
          900: '#213525',
        },
        cream: '#faf8f3',
        warm: '#f5f0e8',
      },
    },
  },
  plugins: [],
}
