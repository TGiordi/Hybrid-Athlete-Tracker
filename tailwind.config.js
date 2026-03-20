/** @type {import('tailwindcss').Config} */
module.exports = {
  // CONFIGURACIÓN DE RUTAS MÁS ROBUSTA PARA CODESPACES
  content: [
    "./index.html",    // Tu HTML principal en la raíz
    "./app.js",        // Tu JS principal en la raíz
    "./index (4).html" // Por las dudas, si estás usando este otro HTML
  ],
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
