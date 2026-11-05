import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { BuddyMood, BuddyLang } from '../types'

const mood = atom({ plugin: 'orange-buddy-calm', key: 'mood' } as const, {
  mood: 'idle',
  tool: '',
  seq: 0,
} as BuddyMood)
const isHidden = atom({ plugin: 'orange-buddy-calm', key: 'isHidden' } as const, false)
// What he speaks: English by default; `/buddy uk` switches to Ukrainian, kept across sessions.
const lang = atom({ plugin: 'orange-buddy-calm', key: 'lang' } as const, 'en' as BuddyLang)

const LANG_ARGS: Record<string, BuddyLang> = {
  en: 'en', eng: 'en', english: 'en',
  uk: 'uk', ua: 'uk', ukr: 'uk', ukrainian: 'uk', 'укр': 'uk', 'українська': 'uk',
}

const setMood = (
  $: Parameters<typeof update>[0],
  fn: (m: BuddyMood) => BuddyMood,
): Promise<unknown> => update($, mood, fn).catch(() => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'buddy',
      description: 'Show or hide the orange companion; /buddy en or /buddy uk sets its language',
    })
    const saved = await $.store.get('lang').catch(() => undefined)
    if (saved === 'en' || saved === 'uk') {
      await update($, lang, () => saved).catch(() => undefined)
    }

    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg) {
      const next = LANG_ARGS[arg]
      if (!next) {
        return { text: 'Usage: /buddy (show or hide), /buddy en (English), /buddy uk (українська)' }
      }
      await update($, lang, () => next)
      await $.store.set('lang', next).catch(() => undefined)
      return { text: next === 'uk' ? 'Помаранчик тепер говорить українською 🇺🇦' : 'Orange Buddy now speaks English' }
    }

    const hidden = await update($, isHidden, was => !was)
    const uk = (await read($, lang)) === 'uk'
    if (hidden) {
      return { text: uk ? 'Помаранчик пішов подрімати. /buddy — покликати.' : 'Orange Buddy went for a nap. /buddy calls it back.' }
    }
    return { text: uk ? 'Помаранчик повернувся!' : 'Orange Buddy is back!' }
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
        props={{ ...m, isWorking: e.props.isWorking, lang: await read($, lang) }}
        width="100%"
        height={3}
      />
    )
  })
}
