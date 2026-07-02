/**
 * Tests for ChatBubble: user vs assistant rendering, markdown text, and
 * reference quick-link dispatch.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { ChatBubble } from '@/components/chat/ChatBubble';

describe('ChatBubble', () => {
  it('renders a user turn with its content', async () => {
    const { getByText } = await render(
      <ChatBubble message={{ id: 'u1', role: 'user', content: 'Hello Shamwari' }} />,
    );
    expect(getByText('Hello Shamwari')).toBeTruthy();
  });

  it('renders assistant markdown with a bold span', async () => {
    const { getByText } = await render(
      <ChatBubble
        message={{ id: 'a1', role: 'assistant', content: '**Harare** is sunny' }}
      />,
    );
    // Bold and normal segments render as separate Text nodes.
    expect(getByText('Harare')).toBeTruthy();
    expect(getByText(' is sunny')).toBeTruthy();
  });

  it('renders location reference chips and dispatches on press', async () => {
    const onReferencePress = jest.fn();
    const { getByLabelText } = await render(
      <ChatBubble
        message={{
          id: 'a2',
          role: 'assistant',
          content: 'Here you go',
          references: [{ slug: 'harare', name: 'Harare', type: 'weather' }],
        }}
        onReferencePress={onReferencePress}
      />,
    );
    fireEvent.press(getByLabelText('Open weather for Harare'));
    expect(onReferencePress).toHaveBeenCalledWith({
      slug: 'harare',
      name: 'Harare',
      type: 'weather',
    });
  });

  it('omits references that are not location/weather typed', async () => {
    const { queryByLabelText } = await render(
      <ChatBubble
        message={{
          id: 'a3',
          role: 'assistant',
          content: 'ok',
          references: [{ slug: 'x', name: 'X', type: 'other' }],
        }}
      />,
    );
    expect(queryByLabelText('Open weather for X')).toBeNull();
  });
});
