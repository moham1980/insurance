import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Primitive/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  args: {
    title: 'عنوان پیام',
    description: 'این یک پیام نمونه است.',
    variant: 'default',
  },
};

export const Success: Story = {
  args: {
    title: 'عملیات موفق',
    description: 'درخواست شما با موفقیت ثبت شد.',
    variant: 'success',
  },
};

export const Error: Story = {
  args: {
    title: 'خطا',
    description: 'مشکلی رخ داد. لطفاً دوباره تلاش کنید.',
    variant: 'error',
  },
};
