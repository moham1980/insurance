import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from './Popover';
import { Button } from './Button';

const meta: Meta<typeof Popover> = {
  title: 'Primitive/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'select', options: ['start', 'center', 'end'] },
    side: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">باز کردن</Button>,
    children: (
      <div>
        <h4 className="text-sm font-semibold">عنوان پاپ‌اور</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          این یک محتوای نمونه برای پاپ‌اور است.
        </p>
      </div>
    ),
    align: 'center',
    side: 'bottom',
  },
};
