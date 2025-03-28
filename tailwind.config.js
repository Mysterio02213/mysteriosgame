/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // Ensure Tailwind scans all relevant files
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'], // Add Poppins as a custom font
      },
    },
  },
  plugins: [],
};
