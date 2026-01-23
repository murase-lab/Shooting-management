/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#2e616b",
                "background-light": "#fafafa",
                "background-dark": "#121416",
                "accent-sand": "#CAC0B5",
                "surface-dark": "#1e2226"
            },
            fontFamily: {
                "display": ["Epilogue", "Space Grotesk", "Noto Sans JP", "sans-serif"],
                "body": ["Manrope", "Plus Jakarta Sans", "Noto Sans JP", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.375rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
