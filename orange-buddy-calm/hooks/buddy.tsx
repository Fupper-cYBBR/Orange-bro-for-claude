import type { ClientModule } from 'claude-code'

type Props = { mood: 'idle' | 'thinking' | 'tool' | 'done'; tool: string; seq: number; isWorking: boolean }

type State = {
  tick: number
  x: number
  dir: 1 | -1
  pauseUntil: number
  blinkUntil: number
  say: string
  sayUntil: number
  seenSeq: number
  lastChange: number
  doneUntil: number
  wasBusy: boolean
  busySince: number
}

const TICK_MS = 300
// Mascot (12) + gap (1) + laptop (6).
const WIDTH = 19

// Cell "pixels". Each run of equal cells is one coloured Box, so no font gaps.
const PALETTE: Record<string, string> = {
  '#': '#D97757', // body
  '.': '#2B1A14', // eye
  S: '#3B3F46', // laptop screen
  g: '#7EE787', // a line of code on the screen
  K: '#A7ADB5', // laptop base
}

// The little orange creature: a compact body, two eyes, arm nubs, four legs.
const EYES_MID = '  ##.##.##  '
const EYES_RIGHT = '  ###.##.#  '
const EYES_LEFT = '  #.##.###  '
const EYES_SHUT = '  ########  '
const ARMS_UP = ' ###.##.### '
const BODY = '############'
const BODY_ARMS_UP = '  ########  '
const LEGS_STAND = '  # #  # #  '
// A full step cycle, walking right: one pair swings forward, then the other.
const LEGS_WALK = ['  # #  # #  ', '   ##   ##  ', '  # #  # #  ', '  ##   ##   ']
const mirror = (row: string) => row.split('').reverse().join('')

// The laptop, beside him while he works.
const LAPTOP_HIDDEN = ['      ', '      ', '      ']
const LAPTOP_COMING = ['      ', '      ', 'KKKKKK']
const LAPTOP_A = [' SSSS ', ' SgSS ', 'KKKKKK']
const LAPTOP_B = [' SSSS ', ' SSgS ', 'KKKKKK']
const LAPTOP_C = [' SgSS ', ' SSSS ', 'KKKKKK']

const IDLE_LINES = ['♪', '☕', 'хм…', 'тут затишно', '✿', 'біп-буп', '…', '★']
const DONE_LINES = ['готово!', 'ура ✦', 'зроблено', '✓']

function toolLine(tool: string): string {
  if (tool === 'Read') return 'гортаю файл 📖'
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'пишу ✎'
  if (tool === 'Bash' || tool === 'PowerShell') return 'тиць-тиць ⌨'
  if (tool === 'Grep' || tool === 'Glob') return 'шукаю 🔍'
  if (tool.startsWith('WebFetch') || tool.startsWith('WebSearch') || tool.includes('Browser')) return 'визираю в мережу 🌐'
  if (tool === 'Agent') return 'кличу друзів'
  return 'працюю…'
}

function pick<T>(list: readonly T[], n: number): T {
  return list[Math.abs(n) % list.length] as T
}

function isBusy(p: Props): boolean {
  return p.isWorking || p.mood === 'thinking' || p.mood === 'tool'
}

// Only the tick changes the state; the latest props are kept here for it.
let latest: Props = { mood: 'idle', tool: '', seq: 0, isWorking: false }

const Buddy: ClientModule<Props, State> = (props, surface) => {
  latest = props
  const { Box, Text } = surface.elements
  const s = surface.state

  if (s === undefined) {
    surface.setState({
      tick: 0, x: 2, dir: 1, pauseUntil: 6, blinkUntil: 0, say: '', sayUntil: 0,
      seenSeq: props.seq, lastChange: 0, doneUntil: 0, wasBusy: false, busySince: 0,
    })
    surface.every(TICK_MS, () => {
      const cur = surface.state
      if (cur === undefined) return
      surface.setState(step(cur, latest, surface.columns))
    })
    return <Text> </Text>
  }

  const busy = isBusy(props)
  const asleep = !busy && s.tick - s.lastChange > 400 // ~2 minutes of quiet
  const flap = s.tick < s.doneUntil && s.tick % 2 === 0
  const walking = !busy && !asleep && s.tick >= s.pauseUntil
  const blink = asleep || s.tick < s.blinkUntil

  const eyes = blink ? EYES_SHUT : busy ? EYES_RIGHT : walking ? (s.dir > 0 ? EYES_RIGHT : EYES_LEFT) : EYES_MID
  const top = flap ? ARMS_UP : eyes
  const mid = flap ? BODY_ARMS_UP : BODY
  const stepRow = pick(LEGS_WALK, s.tick)
  const legs = walking ? (s.dir > 0 ? stepRow : mirror(stepRow)) : LEGS_STAND

  // He pulls the laptop out when work starts and types on it while busy.
  const out = s.tick - s.busySince
  const laptop = !busy ? LAPTOP_HIDDEN : out < 2 ? LAPTOP_COMING : pick([LAPTOP_A, LAPTOP_B, LAPTOP_C], s.tick)

  let bubble = ''
  if (asleep) bubble = pick(['z', 'z z', 'z z z'], Math.floor(s.tick / 3))
  else if (props.mood === 'tool') bubble = toolLine(props.tool)
  else if (busy) bubble = 'думаю' + '.'.repeat(1 + (s.tick % 3))
  else if (s.tick < s.sayUntil) bubble = s.say

  const row = (pattern: string, key: string, extra?: string) => {
    const cells = []
    let i = 0
    while (i < pattern.length) {
      const ch = pattern[i] ?? ' '
      let j = i
      while (j < pattern.length && pattern[j] === ch) j++
      const color = PALETTE[ch]
      cells.push(
        color
          ? <Box key={key + i} width={j - i} height={1} backgroundColor={color} />
          : <Box key={key + i} width={j - i} height={1} />,
      )
      i = j
    }
    return (
      <Box key={key} flexDirection="row" height={1}>
        <Box width={Math.max(0, s.x)} height={1} />
        {cells}
        {extra ? <Text dimColor>{'  ' + extra}</Text> : null}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {row(top + ' ' + laptop[0], 't', bubble)}
      {row(mid + ' ' + laptop[1], 'm')}
      {row(legs + ' ' + laptop[2], 'l')}
    </Box>
  )
}

function step(s: State, p: Props, columns: number): State {
  const tick = s.tick + 1
  const next: State = { ...s, tick }
  const busy = isBusy(p)
  // Leave room for the speech bubble on the right.
  const maxX = Math.max(0, Math.min(columns - WIDTH - 24, 60))

  if (busy && !s.wasBusy) next.busySince = tick
  next.wasBusy = busy

  if (p.seq !== s.seenSeq) {
    next.seenSeq = p.seq
    next.lastChange = tick
    if (p.mood === 'done') {
      next.doneUntil = tick + 6
      next.say = pick(DONE_LINES, tick)
      next.sayUntil = tick + 12
    }
  }

  // Blink now and then.
  if (tick % 17 === 0 || (tick * 7) % 53 === 0) next.blinkUntil = tick + 1

  if (!busy && tick - next.lastChange <= 400) {
    // Wander: walk a few steps, then stop and look around.
    if (tick >= s.pauseUntil) {
      let x = s.x + s.dir
      let dir = s.dir
      if (x >= maxX) { x = maxX; dir = -1 }
      if (x <= 0) { x = 0; dir = 1 }
      next.x = x
      next.dir = dir
      if ((tick * 13) % 29 === 0) next.pauseUntil = tick + 8 + (tick % 12)
    }
    // A quiet remark, rarely.
    if (tick >= s.sayUntil && (tick * 11) % 97 === 0) {
      next.say = pick(IDLE_LINES, tick)
      next.sayUntil = tick + 10
    }
  } else if (next.x > maxX) {
    next.x = maxX
  }

  return next
}

export default Buddy
