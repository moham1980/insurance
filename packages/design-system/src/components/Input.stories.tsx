import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    hint: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'متن خود را وارد کنید' },
};

export const WithLabel: Story = {
  args: { label: 'نام کامل', placeholder: 'نام و نام خانوادگی' },
};

export const WithError: Story = {
  args: { label: 'ایمیل', error: 'ایمیل نامعتبر است', placeholder: 'example@domain.com' },
};

export const WithHint: Story = {
  args: { label: 'رمز عبور', hint: 'حداقل ۸ کاراکتر', type: 'password' },
};
