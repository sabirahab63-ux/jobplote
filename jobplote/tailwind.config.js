const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((k) => [k, v(`b${k}`)])
);

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'), paper: v('bg'), surface: v('surface'),
        brand,
        blue: brand,
        cobalt: v('b600'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
};