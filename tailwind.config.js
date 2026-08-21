/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Phone-first breakpoints keyed to common device widths (NativeWind
    // resolves these against useWindowDimensions() width, not a media
    // query) - `sm` catches larger phones/phablets in landscape, `md`/`lg`
    // catch iPad mini/portrait and iPad/landscape (supportsTablet: true in
    // app.json makes this a real target, not a hypothetical).
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
    },
    extend: {
      colors: {
        // White/neutral theme - gold/amber is the single accent used
        // throughout (buttons, active states, links). No teal anywhere.
        primary: {
          50: '#FBF3DF',
          100: '#F5E6C0',
          200: '#EAD599',
          300: '#DFC372',
          400: '#D2AF52',
          500: '#B8923E',
          600: '#9C7A34',
          700: '#7D622A',
          800: '#5F4A20',
          900: '#413316',
          950: '#2A210E',
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
