import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
  argTypes: {
    elevation: { control: 'select', options: [1, 2, 3] },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Elevation1: Story = {
  args: {
    elevation: 1,
    className: 'p-6',
    children: 'کارت با سایه سطح ۱',
  },
};

export const Elevation2: Story = {
  args: {
    elevation: 2,
    className: 'p-6',
    children: 'کارت با سایه سطح ۲',
  },
};

export const Elevation3: Story = {
  args: {
    elevation: 3,
    className: 'p-6',
    children: 'کارت با سایه سطح ۳',
  },
};
