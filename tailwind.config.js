/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"], // Le dice que busque clases en tu index y tu app.js
  theme: {
    extend: {
      fontFamily: { sans: ['Montserrat', 'sans-serif'] },
      colors: {
        custom: { 
          bg: '#0a0a0a', 
          card: '#171717', 
          border: '#262626', 
          primary: '#F54927', 
          hover: '#d43e20', 
          text: '#F8FAFC', 
          textMuted: '#94A3B8' 
        }
      }
    }
  },
  plugins: [],
}