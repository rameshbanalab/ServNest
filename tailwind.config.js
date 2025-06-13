module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Orange Red Theme
        primary: {
          DEFAULT: '#FF4500',   // Vibrant orange-red
          light: '#FFECE5',     // Soft tint for backgrounds
          dark: '#CC3700',      // Deep orange-red for active states
        },

        // Accent Colors
        accent: {
          red: '#FF6347',       // Tomato red for alerts/warnings
          softRed: '#FFE5E5',   // Light background red
          yellow: '#F9D923',    // For rewards/highlights
          blue: '#1E88E5',      // Social logins
          gray: '#B0B0B0',      // Neutral for icons, secondary text
        },

        // Neutrals
        gray: {
          50: '#FAFAFA',
          100: '#F2F2F2',
          200: '#E0E0E0',
          300: '#CCCCCC',
          400: '#A0A0A0',
          600: '#4D4D4D',
          700: '#2B2B2B',
          800: '#181818',
        },

        white: '#FFFFFF',
        black: '#000000',
      },
    },
  },
  plugins: [],
};
