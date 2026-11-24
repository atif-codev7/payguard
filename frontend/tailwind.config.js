/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: "#0b0f17",
          card: "#121824",
          border: "#1e293b",
          accent: "#3b82f6",
          emerald: "#10b981",
          rose: "#ef4444",
          amber: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
