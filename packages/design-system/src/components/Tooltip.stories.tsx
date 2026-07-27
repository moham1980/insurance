import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitive/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    children: <Button variant="secondary">نشانه‌گذاری</Button>,
    content: 'این یک راهنمای ابزار است.',
    side: 'top',
  },
};
