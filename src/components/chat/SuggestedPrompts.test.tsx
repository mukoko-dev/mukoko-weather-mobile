/**
 * Tests for the suggested-prompt chips: rendering, selection dispatch, and
 * the disabled state.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts';

const PROMPTS = [
  { label: 'Drone flying today', query: 'Can I fly a drone today?' },
  { label: 'Farming advice', query: 'When should I plant?' },
];

describe('SuggestedPrompts', () => {
  it('renders a chip per prompt', async () => {
    const { getByText } = await render(
      <SuggestedPrompts prompts={PROMPTS} onSelect={() => {}} />,
    );
    expect(getByText('Drone flying today')).toBeTruthy();
    expect(getByText('Farming advice')).toBeTruthy();
  });

  it('dispatches the prompt query on press', async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <SuggestedPrompts prompts={PROMPTS} onSelect={onSelect} />,
    );
    fireEvent.press(getByText('Drone flying today'));
    expect(onSelect).toHaveBeenCalledWith('Can I fly a drone today?');
  });

  it('marks chips disabled when disabled', async () => {
    const { getByLabelText } = await render(
      <SuggestedPrompts prompts={PROMPTS} onSelect={() => {}} disabled />,
    );
    expect(getByLabelText('Farming advice').props.accessibilityState.disabled).toBe(
      true,
    );
  });
});
