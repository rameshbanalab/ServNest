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
        // Brand Green (Primary)
        primary: {
          DEFAULT: '#8BC34A', // Main app green (used in headers, buttons)
          light: '#C5E1A5', // Lighter green (hover, backgrounds)
          dark: '#689F38', // Darker green (active states)
        },
        // Accent Colors
        accent: {
          yellow: '#F9D923', // Used for Paytm reward badge
          blue: '#1976D2', // For social login (Facebook)
          red: '#D32F2F', // For social login (Google+)
        },
        // Neutrals
        gray: {
          50: '#F9FAFB', // Lightest background
          100: '#F3F4F6', // Card backgrounds
          200: '#E5E7EB', // Input backgrounds
          300: '#D1D5DB', // Borders
          400: '#9CA3AF', // Placeholder text
          700: '#374151', // Headings, dark text
        },
        white: '#FFFFFF',
        black: '#000000',
      },
    },
  },
  plugins: [],
};