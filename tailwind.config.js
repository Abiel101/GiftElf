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
        'white': '#fcfcfc'
      },
      backgroundImage:{
        'christmasTrees': "url('./dist/img/Background-Image.png')",
      }
    },
  },
  plugins: [],
}

