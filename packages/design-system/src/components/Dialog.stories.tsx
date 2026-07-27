import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './Dialog';
import { Button } from './Button';

const meta: Meta<typeof Dialog> = {
  title: 'Primitive/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  args: {
    open: true,
    title: 'عنوان دیالوگ',
    description: 'این یک توضیح نمونه برای دیالوگ است.',
    children: <p className="text-sm text-foreground">محتوای دیالوگ در اینجا قرار می‌گیرد.</p>,
    footer: (
      <>
        <Button variant="secondary" onClick={() => {}}>انصراف</Button>
        <Button onClick={() => {}}>تایید</Button>
      </>
    ),
  },
};
