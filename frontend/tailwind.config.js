/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#ffffff',
        'sidebar-hover': '#f4f5f7',
        surface: '#f4f5f7',
        card: '#ffffff',
        accent: {
          DEFAULT: '#7c5cfc',
          hover: '#6b4ef0',
          light: '#ede9ff'
        },
        muted: '#6b7280',
        border: '#e5e7eb'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}
