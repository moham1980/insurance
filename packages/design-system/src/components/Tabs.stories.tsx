import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Primitive/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    tabs: [
      { id: 'overview', label: 'نمای کلی', content: <p className="text-sm">محتوای نمای کلی</p> },
      { id: 'details', label: 'جزئیات', content: <p className="text-sm">محتوای جزئیات</p> },
      { id: 'settings', label: 'تنظیمات', content: <p className="text-sm">محتوای تنظیمات</p> },
    ],
    defaultTab: 'overview',
  },
};
