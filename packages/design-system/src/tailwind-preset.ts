import type { Config } from 'tailwindcss';

/**
 * Insurance Design System — Tailwind CSS Preset
 * Token-driven, RTL-native, dark-mode ready.
 */
const preset: Config = {
  darkMode: 'class',
  content: [],
  theme: {
    screens: {
      'xs': '360px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Background
        'bg-base': 'var(--color-bg-base)',
        'bg-subtle': 'var(--color-bg-subtle)',
        'bg-raised': 'var(--color-bg-raised)',
        'bg-overlay': 'var(--color-bg-overlay)',
        // Text
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-on-brand': 'var(--color-text-on-brand)',
        'text-disabled': 'var(--color-text-disabled)',
        // Brand
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-accent': 'var(--color-brand-accent)',
        // Status
        'success': 'var(--color-status-success)',
        'warning': 'var(--color-status-warning)',
        'danger': 'var(--color-status-danger)',
        'info': 'var(--color-status-info)',
        // Border
        'border': 'var(--color-border-default)',
        'border-default': 'var(--color-border-default)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-focus': 'var(--color-border-focus)',
        // Surface
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        // shadcn/ui backward-compat aliases
        'background': 'var(--color-bg-base)',
        'foreground': 'var(--color-text-primary)',
        'card': 'var(--color-bg-raised)',
        'card-foreground': 'var(--color-text-primary)',
        'popover': 'var(--color-bg-raised)',
        'popover-foreground': 'var(--color-text-primary)',
        'primary': 'var(--color-brand-primary)',
        'primary-foreground': 'var(--color-text-on-brand)',
        'secondary': 'var(--color-brand-secondary)',
        'secondary-foreground': 'var(--color-text-on-brand)',
        'muted': 'var(--color-bg-subtle)',
        'muted-foreground': 'var(--color-text-muted)',
        'accent': 'var(--color-brand-accent)',
        'accent-foreground': 'var(--color-text-on-brand)',
        'input': 'var(--color-border-default)',
        'ring': 'var(--color-border-focus)',
      },
      fontFamily: {
        'primary': ['Vazirmatn', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        'latin': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'h2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h3': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'number-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
      },
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
        'pill': '999px',
        'full': '50%',
      },
      boxShadow: {
        '1': '0 1px 2px rgb(0 0 0 / 0.06)',
        '2': '0 4px 12px rgb(0 0 0 / 0.08)',
        '3': '0 12px 32px rgb(0 0 0 / 0.12)',
        'inset': 'inset 0 2px 4px rgb(0 0 0 / 0.06)',
        'focus': '0 0 0 3px rgb(30 91 255 / 0.2)',
      },
      transitionDuration: {
        'fast': '120ms',
        'base': '200ms',
        'slow': '320ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
        'exit': 'cubic-bezier(0.4, 0, 1, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-rtl': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-rtl': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-in-rtl': 'slide-in-rtl 200ms ease-standard',
        'slide-out-rtl': 'slide-out-rtl 200ms ease-exit',
        'fade-in': 'fade-in 200ms ease-standard',
        'scale-in': 'scale-in 200ms ease-standard',
      },
    },
  },
  plugins: [],
};

export default preset;
