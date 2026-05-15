import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian palette
        obsidian: {
          bg:       '#0A0A0A',
          surface:  '#131313',
          hi:       '#1A1A1A',
          border:   '#2A2A2A',
          borderhi: '#3A3A3A',
          sidebar:  '#0D0D0D',
        },
        lime: {
          DEFAULT: '#E8FF47',
          dark:    '#C8DF1F',
          dim:     'rgba(232,255,71,0.10)',
        },
        coral: {
          DEFAULT: '#FF4747',
          dim:     'rgba(255,71,71,0.10)',
        },
        // Legacy teal — kept for admin pages
        primary: {
          DEFAULT: '#01696f',
          hover:   '#0c4e54',
          active:  '#0f3638',
        },
      },
      fontFamily: {
        syne:  ['Syne', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        input:  '6px',
        badge:  '4px',
        pill:   '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
