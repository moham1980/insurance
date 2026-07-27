import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    isLoading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'دکمه اصلی' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'دکمه ثانویه' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'دکمه شفاف' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'دکمه خطر' },
};

export const Loading: Story = {
  args: { variant: 'primary', isLoading: true, children: 'در حال بارگذاری' },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">کوچک</Button>
      <Button size="md">متوسط</Button>
      <Button size="lg">بزرگ</Button>
    </div>
  ),
};
