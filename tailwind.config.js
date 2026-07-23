/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches the customer app's brand palette (react_app/constants/theme.ts
        // COLORS.primary #1aa3b0 / #0c6c75) so both apps read as one product.
        primary: {
          50: '#e0f7f8',
          100: '#b3ecef',
          200: '#80dfe4',
          300: '#4dd2d9',
          400: '#26c8d1',
          500: '#1aa3b0',
          600: '#158e99',
          700: '#107079',
          800: '#0c6c75',
          900: '#094e54',
          950: '#052a2e',
        },
        accent: {
          400: '#dbc06e',
          500: '#C9A84C',
          600: '#a88a3a',
        },
        surface: {
          light: '#ffffff',
          dark: '#0D0D0D',
          card: '#1c1c1c',
          muted: '#FAFAFA',
        },
      },
      fontFamily: {
        sans: ['Inter-Regular'],
        medium: ['Inter-Medium'],
        semibold: ['Inter-SemiBold'],
        bold: ['Inter-Bold'],
      },
    },
  },
  plugins: [],
};
