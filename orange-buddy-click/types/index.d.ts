export type Mood = 'idle' | 'thinking' | 'tool' | 'done'
export type BuddyMood = { mood: Mood; tool: string; seq: number }

declare module 'claude-code' {
  interface PluginState {
    'orange-buddy-click': { mood: BuddyMood; isHidden: boolean }
  }
}
