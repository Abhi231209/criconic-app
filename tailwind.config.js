import gluestackPlugin from "@gluestack-ui/nativewind-utils/tailwind-plugin";

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : "media",
  content: [
    "./App.js",
    "./Layout.jsx",
    "./screens/**/*.{html,js,jsx,ts,tsx,mdx}",
    "./components/**/*.{html,js,jsx,ts,tsx,mdx}",
    "./navigation/**/*.{html,js,jsx,ts,tsx,mdx}",
    "./hooks/**/*.{html,js,jsx,ts,tsx,mdx}",
  ],
  presets: [require("nativewind/preset")],
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark|primary)/,
    },
  ],
  theme: {
    extend: {
      colors: {
  // PRIMARY COLORS
  primary: {
    DEFAULT: "rgb(37 99 235 / <alpha-value>)",             // light mode default
    dark: "rgb(59 130 246 / <alpha-value>)",               // dark mode default
    0: "rgb(30 41 59 / <alpha-value>)",
    50: "rgb(37 56 84 / <alpha-value>)",
    100: "rgb(59 81 125 / <alpha-value>)",
    200: "rgb(89 122 189 / <alpha-value>)",
    300: "rgb(96 165 250 / <alpha-value>)",
    400: "rgb(59 130 246 / <alpha-value>)",
    500: "rgb(37 99 235 / <alpha-value>)",
    600: "rgb(29 78 216 / <alpha-value>)",
    700: "rgb(30 64 175 / <alpha-value>)",
    800: "rgb(30 58 138 / <alpha-value>)",
    900: "rgb(23 37 84 / <alpha-value>)",
    950: "rgb(20 30 66 / <alpha-value>)",
  },

  // SECONDARY COLORS
  secondary: {
    DEFAULT: "rgb(140 95 225 / <alpha-value>)",
    dark: "rgb(95 59 156 / <alpha-value>)",
    0: "rgb(38 36 46 / <alpha-value>)",
    50: "rgb(65 58 87 / <alpha-value>)",
    100: "rgb(90 78 117 / <alpha-value>)",
    200: "rgb(116 101 149 / <alpha-value>)",
    300: "rgb(140 95 225 / <alpha-value>)",
    400: "rgb(116 84 222 / <alpha-value>)",
    500: "rgb(95 59 156 / <alpha-value>)",
    600: "rgb(69 41 120 / <alpha-value>)",
    700: "rgb(48 28 84 / <alpha-value>)",
    800: "rgb(34 20 60 / <alpha-value>)",
    900: "rgb(28 16 45 / <alpha-value>)",
    950: "rgb(18 10 30 / <alpha-value>)",
  },

  // BACKGROUND COLORS
  background: {
    DEFAULT: "#ffffff", // light background
    dark: "#000000",    // dark background
    0: "rgb(10 10 12 / <alpha-value>)",
    50: "rgb(15 15 15 / <alpha-value>)",
    100: "rgb(24 24 27 / <alpha-value>)",
    200: "rgb(34 34 40 / <alpha-value>)",
    300: "rgb(55 55 63 / <alpha-value>)",
    400: "rgb(75 75 85 / <alpha-value>)",
    500: "rgb(100 100 110 / <alpha-value>)",
    600: "rgb(130 130 140 / <alpha-value>)",
    700: "rgb(170 170 180 / <alpha-value>)",
    800: "rgb(200 200 210 / <alpha-value>)",
    900: "rgb(230 230 240 / <alpha-value>)",
    950: "rgb(245 245 255 / <alpha-value>)",
    light: "#F9FAFB", // optional for use
    dark: "#111827",
  },

  // TYPOGRAPHY
  typography: {
    DEFAULT: "#181818",
    dark: "#ffffff",
    0: "rgb(255 255 255 / <alpha-value>)",
    50: "rgb(245 245 245 / <alpha-value>)",
    100: "rgb(224 224 224 / <alpha-value>)",
    200: "rgb(189 189 189 / <alpha-value>)",
    300: "rgb(158 158 158 / <alpha-value>)",
    400: "rgb(117 117 117 / <alpha-value>)",
    500: "rgb(97 97 97 / <alpha-value>)",
    600: "rgb(66 66 66 / <alpha-value>)",
    700: "rgb(33 33 33 / <alpha-value>)",
    800: "rgb(18 18 18 / <alpha-value>)",
    900: "rgb(12 12 12 / <alpha-value>)",
    950: "rgb(8 8 8 / <alpha-value>)",
    white: "#ffffff",
    gray: "#a1a1aa",
    black: "#0f0f0f",
  },

  // SUCCESS / ERROR / WARNING / INFO
  success: {
    DEFAULT: "rgb(76 175 80 / <alpha-value>)",
    dark: "rgb(200 230 201 / <alpha-value>)",
    0: "rgb(20 39 24 / <alpha-value>)",
    50: "rgb(35 71 38 / <alpha-value>)",
    100: "rgb(56 142 60 / <alpha-value>)",
    200: "rgb(76 175 80 / <alpha-value>)",
    300: "rgb(129 199 132 / <alpha-value>)",
    400: "rgb(165 214 167 / <alpha-value>)",
    500: "rgb(200 230 201 / <alpha-value>)",
    600: "rgb(232 245 233 / <alpha-value>)",
    700: "rgb(238 255 240 / <alpha-value>)",
    800: "rgb(243 255 245 / <alpha-value>)",
    900: "rgb(245 255 250 / <alpha-value>)",
    950: "rgb(248 255 252 / <alpha-value>)",
  },

  error: {
    DEFAULT: "rgb(244 67 54 / <alpha-value>)",
    dark: "rgb(127 17 17 / <alpha-value>)",
    0: "rgb(50 16 15 / <alpha-value>)",
    50: "rgb(95 29 28 / <alpha-value>)",
    100: "rgb(127 17 17 / <alpha-value>)",
    200: "rgb(183 28 28 / <alpha-value>)",
    300: "rgb(244 67 54 / <alpha-value>)",
    400: "rgb(229 57 53 / <alpha-value>)",
    500: "rgb(211 47 47 / <alpha-value>)",
    600: "rgb(198 40 40 / <alpha-value>)",
    700: "rgb(183 28 28 / <alpha-value>)",
    800: "rgb(127 17 17 / <alpha-value>)",
    900: "rgb(86 10 10 / <alpha-value>)",
    950: "rgb(46 5 5 / <alpha-value>)",
  },

  warning: {
    DEFAULT: "rgb(255 193 7 / <alpha-value>)",
    dark: "rgb(253 216 53 / <alpha-value>)",
    0: "rgb(66 53 15 / <alpha-value>)",
    50: "rgb(102 85 20 / <alpha-value>)",
    100: "rgb(255 193 7 / <alpha-value>)",
    200: "rgb(255 213 102 / <alpha-value>)",
    300: "rgb(255 235 59 / <alpha-value>)",
    400: "rgb(255 248 225 / <alpha-value>)",
    500: "rgb(253 216 53 / <alpha-value>)",
    600: "rgb(255 160 0 / <alpha-value>)",
    700: "rgb(255 143 0 / <alpha-value>)",
    800: "rgb(255 111 0 / <alpha-value>)",
    900: "rgb(255 87 34 / <alpha-value>)",
    950: "rgb(191 54 12 / <alpha-value>)",
  },

  info: {
    DEFAULT: "rgb(59 130 246 / <alpha-value>)",
    dark: "rgb(144 202 249 / <alpha-value>)",
    0: "rgb(15 23 42 / <alpha-value>)",
    50: "rgb(30 41 59 / <alpha-value>)",
    100: "rgb(59 130 246 / <alpha-value>)",
    200: "rgb(96 165 250 / <alpha-value>)",
    300: "rgb(144 202 249 / <alpha-value>)",
    400: "rgb(187 222 251 / <alpha-value>)",
    500: "rgb(227 242 253 / <alpha-value>)",
    600: "rgb(235 248 255 / <alpha-value>)",
    700: "rgb(241 251 255 / <alpha-value>)",
    800: "rgb(245 253 255 / <alpha-value>)",
    900: "rgb(250 255 255 / <alpha-value>)",
    950: "rgb(252 255 255 / <alpha-value>)",
  },

  outline: {
    DEFAULT: "rgb(212 212 212 / <alpha-value>)",
    dark: "rgb(82 82 82 / <alpha-value>)",
    0: "rgb(38 38 38 / <alpha-value>)",
    50: "rgb(51 51 51 / <alpha-value>)",
    100: "rgb(64 64 64 / <alpha-value>)",
    200: "rgb(82 82 82 / <alpha-value>)",
    300: "rgb(115 115 115 / <alpha-value>)",
    400: "rgb(163 163 163 / <alpha-value>)",
    500: "rgb(212 212 212 / <alpha-value>)",
    600: "rgb(229 229 229 / <alpha-value>)",
    700: "rgb(240 240 240 / <alpha-value>)",
    800: "rgb(245 245 245 / <alpha-value>)",
    900: "rgb(250 250 250 / <alpha-value>)",
    950: "rgb(255 255 255 / <alpha-value>)",
  },

  indicator: {
    primary: "rgb(59 130 246 / <alpha-value>)",
    error: "rgb(244 67 54 / <alpha-value>)",
    info: "rgb(3 169 244 / <alpha-value>)",
  },
},
      fontFamily: {
        "font-base": "DarkerGrotesque_400Regular",
        "font-medium": "DarkerGrotesque_500Medium",
        "font-semibold": "DarkerGrotesque_600SemiBold",
        "font-bold": "DarkerGrotesque_700Bold",
        "font-extrabold": "DarkerGrotesque_800ExtraBold",
        "font-black": "DarkerGrotesque_900Black",
      },

      fontWeight: {
        extrablack: "950",
      },
      fontSize: {
        "2xs": "10px",
      },
      boxShadow: {
        "hard-1": "-2px 2px 8px 0px rgba(38, 38, 38, 0.20)",
        "hard-2": "0px 3px 10px 0px rgba(38, 38, 38, 0.20)",
        "hard-3": "2px 2px 8px 0px rgba(38, 38, 38, 0.20)",
        "hard-4": "0px -3px 10px 0px rgba(38, 38, 38, 0.20)",
        "hard-5": "0px 2px 10px 0px rgba(38, 38, 38, 0.10)",
        "soft-1": "0px 0px 10px rgba(38, 38, 38, 0.1)",
        "soft-2": "0px 0px 20px rgba(38, 38, 38, 0.2)",
        "soft-3": "0px 0px 30px rgba(38, 38, 38, 0.1)",
        "soft-4": "0px 0px 40px rgba(38, 38, 38, 0.1)",
      },
    },
  },
  plugins: [gluestackPlugin],
};
