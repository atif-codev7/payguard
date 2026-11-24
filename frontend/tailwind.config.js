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
        ink: {
          deep: "#07080d",
          bg: "#0b0d14",
          card: "#11141c",
          raised: "#1a1e28",
          border: "rgba(238, 240, 245, 0.08)",
          primary: "#eef0f5",
          secondary: "#a3a9b8",
          muted: "#7a8296",
          accent: "#2563eb",
          accentHover: "#1d4ed8",
          positive: "#4cc38a",
          negative: "#e5484d",
          warning: "#d97706",
        },
      },
      borderRadius: {
        panel: "16px",
        card: "12px",
        control: "8px",
        tag: "6px",
      },
    },
  },
  plugins: [],
};
