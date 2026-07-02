/**
 * Suggested prompt chips shown on the empty state — mirrors the web app's
 * DEFAULT_SUGGESTED_PROMPTS (src/components/explore/ExploreChatbot.tsx).
 */

export type SuggestedPrompt = {
  label: string;
  query: string;
};

export const DEFAULT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { label: 'Drone flying today', query: 'Can I fly a drone today?' },
  { label: 'Farming advice', query: "What's the best time to plant crops this season?" },
  { label: 'Safari weather', query: "What's the weather like for safari this weekend?" },
  { label: 'Compare cities', query: 'Compare weather in Nairobi and Bangkok' },
  { label: 'Road trip', query: 'Is it safe for a road trip today?' },
  { label: 'Weekend plans', query: 'What outdoor activities can I do this weekend?' },
];
