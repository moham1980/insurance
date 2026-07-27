import type { Preview } from '@storybook/react';
import '../themes/light.css';
import '../themes/dark.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      description: 'Text direction',
      toolbar: {
        title: 'Direction',
        items: [
          { value: 'ltr', title: 'LTR', icon: 'arrowright' },
          { value: 'rtl', title: 'RTL', icon: 'arrowleft' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      const dir = context.globals.direction || 'rtl';
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      root.setAttribute('dir', dir);
      root.setAttribute('lang', dir === 'rtl' ? 'fa' : 'en');
      return Story();
    },
  ],
};

export default preview;
