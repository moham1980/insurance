import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu } from './DropdownMenu';
import { Button } from './Button';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Primitive/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">منو</Button>,
    items: [
      { id: 'copy', label: 'کپی', shortcut: '⌘C', onClick: () => {} },
      { id: 'paste', label: 'چسباندن', shortcut: '⌘V', onClick: () => {} },
      { id: 'delete', label: 'حذف', shortcut: '⌫', disabled: true, onClick: () => {} },
    ],
  },
};
