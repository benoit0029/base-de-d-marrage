import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        maraichage: "#2f7d4f",
        fruits: "#c9762c",
        photobooth: "#7a4fc9",
        synthese: "#2c5f8a",
      },
    },
  },
  plugins: [],
};

export default config;
