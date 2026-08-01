import type { Config } from 'tailwindcss';
import tailwindPreset from '@insurance/design-system/tailwind-preset';

const config: Config = {
  presets: [tailwindPreset],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
