/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#d8ecff',
          200: '#b8ddff',
          500: '#1769aa',
          600: '#11578f',
          700: '#0f4774',
          900: '#172033',
        },
        mint: {
          50: '#ecfdf5',
          500: '#0f8a5f',
          600: '#08704b',
        },
      },
      boxShadow: {
        panel: '0 18px 45px rgba(15, 23, 42, 0.08)',
        float: '0 24px 70px rgba(15, 23, 42, 0.16)',
      },
    },
  },
  plugins: [],
};
