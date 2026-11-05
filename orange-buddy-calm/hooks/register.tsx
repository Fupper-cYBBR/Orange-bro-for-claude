import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { BuddyMood } from '../types'

const mood = atom({ plugin: 'orange-buddy-calm', key: 'mood' } as const, {
  mood: 'idle',
  tool: '',
  seq: 0,
} as BuddyMood)
const isHidden = atom({ plugin: 'orange-buddy-calm', key: 'isHidden' } as const, false)

const setMood = (
  $: Parameters<typeof update>[0],
  fn: (m: BuddyMood) => BuddyMood,
): Promise<unknown> => update($, mood, fn).catch(() => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'buddy',
      description: 'Show or hide the orange companion above the prompt',
    })

    return next(e)
  })

  on('command.run', { command: 'buddy' }, async $ => {
    const hidden = await update($, isHidden, was => !was)

    return { text: hidden ? 'Помаранчик пішов подрімати. /buddy — покликати.' : 'Помаранчик повернувся!' }
  })

  on('prompt.submit', async ($, e, next) => {
    void setMood($, m => ({ mood: 'thinking', tool: '', seq: m.seq + 1 }))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    void setMood($, m => ({ mood: 'tool', tool: e.tool, seq: m.seq + 1 }))
    const result = await next(e)
    await setMood($, m => (m.mood === 'tool' ? { ...m, mood: 'thinking', seq: m.seq + 1 } : m))

    return result
  })

  on('turn.complete', async ($, e, next) => {
    await setMood($, m => ({ mood: 'done', tool: '', seq: m.seq + 1 }))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden)) || e.props.maxRows < 3) {
      return next(e)
    }

    const m = await read($, mood)
    const elements = $.ui.resolve(e)
    if (!('Client' in elements)) {
      return next(e)
    }
    const { Client } = elements

    return (
      <Client
        key="buddy"
        module="./buddy.tsx"
        props={{ ...m, isWorking: e.props.isWorking }}
        width="100%"
        height={3}
      />
    )
  })
}
