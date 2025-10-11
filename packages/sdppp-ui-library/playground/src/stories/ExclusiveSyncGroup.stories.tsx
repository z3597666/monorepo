import type { Meta, StoryObj } from '@storybook/react';
import { useCallback } from 'react';
import { ExclusiveSyncGroup } from 'react-antd-tailwind-ui';
import type { ButtonConfig } from 'react-antd-tailwind-ui';

const meta: Meta<typeof ExclusiveSyncGroup> = {
  title: 'Components/ExclusiveSyncGroup',
  component: ExclusiveSyncGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ExclusiveSyncGroup>;

const buttons: ButtonConfig[] = [
  { id: 'red', text: 'Sync Red', supportsAutoSync: true },
  { id: 'blue', text: 'Sync Blue', supportsAutoSync: true },
  { id: 'green', text: 'Sync Green', supportsAutoSync: true },
];

export const Default: Story = {
  args: {
    buttons,
    onSync: async () => {},
    onAutoSyncChange: () => {},
    buttonWidth: 140,
  },
};
