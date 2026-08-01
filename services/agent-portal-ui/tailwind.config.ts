import type { Config } from 'tailwindcss';
import designSystemPreset from '@insurance/design-system/tailwind-preset';

const config: Config = {
  presets: [designSystemPreset],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
