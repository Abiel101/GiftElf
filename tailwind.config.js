/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./dist/*.html"],
  theme: {
    extend: {
      fontFamily:{
        'jetBrainsMono': "JetBrains Mono",
        'inter': "Inter",
      },
      colors:{
        'white': '#fcfcfc',
        'bright-white': '#ffffff',
        'lighter-black': '#222222',
        'accent-red': '#FB4D54',
      },
    },
  },
  plugins: [],
}

