import type { ClientModule, ClientPointerEvent, ClientKeyEvent } from 'claude-code'

type Lang = 'en' | 'uk'
type Props = { mood: 'idle' | 'thinking' | 'tool' | 'done'; tool: string; seq: number; isWorking: boolean; lang?: Lang }

type Act =
  | 'none' | 'jump' | 'hearts' | 'spin' | 'squish' | 'wave' | 'dizzy'
  | 'dance' | 'stretch' | 'land' | 'found'

type Particle = { x: number; dx: number; ch: string; color: string; until: number; marker?: true }

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
  // Reactions.
  act: Act
  actStart: number
  actUntil: number
  pokes: number
  clicks: number[]
  parts: Particle[]
  drag: { off: number; startX: number; moved: boolean } | null
  lookX: number
  hover: boolean
  targetX: number
}

const TICK_MS = 150
const BODY_W = 12
// Mascot (12) + gap (1) + laptop (6).
const WIDTH = 19
const ROWS = 4

// Cell "pixels". Each run of equal cells is one coloured Box, so no font gaps.
const PALETTE: Record<string, string> = {
  '#': '#D97757', // body
  R: '#D0453A', // body, cross
  '.': '#2B1A14', // eye
  w: '#F5F0E8', // eye, rolling
  p: '#F2A0A0', // blush
  h: '#3A2A25', // shadow
  S: '#3B3F46', // laptop screen
  g: '#7EE787', // a line of code on the screen
  K: '#A7ADB5', // laptop base
}

// The little orange creature: a compact body, two eyes, arm nubs, four legs.
const EYES_MID = '  ##.##.##  '
const EYES_RIGHT = '  ###.##.#  '
const EYES_LEFT = '  #.##.###  '
const EYES_SHUT = '  ########  '
const EYES_HAPPY = '  #p####p#  '
const EYES_WIDE = '  #w.##w.#  '
const EYES_ROLL = '  ##w##w##  '
const BACK = '  ########  '
const ARMS_UP = ' ###.##.### '
const ARMS_UP_SHUT = ' ########## '
const BODY = '############'
const BODY_ARMS_UP = '  ########  '
const LEGS_STAND = '  # #  # #  '
const LEGS_TUCK = '   ##  ##   '
const LEGS_DANGLE = '   #  #  #  '
const SQUISH_TOP = '            '
const SQUISH_MID = ' ###.##.### '
const SQUISH_LOW = '############'
const SHADOW = '   hhhhhh   '
// A full step cycle, walking right: one pair swings forward, then the other.
const LEGS_WALK = ['  # #  # #  ', '   ##   ##  ', '  # #  # #  ', '  ##   ##   ']
const mirror = (row: string) => row.split('').reverse().join('')

// The laptop, beside him while he works.
const LAPTOP_HIDDEN = ['      ', '      ', '      ']
const LAPTOP_COMING = ['      ', '      ', 'KKKKKK']
const LAPTOP_A = [' SSSS ', ' SgSS ', 'KKKKKK']
const LAPTOP_B = [' SSSS ', ' SSgS ', 'KKKKKK']
const LAPTOP_C = [' SgSS ', ' SSSS ', 'KKKKKK']

// Everything he says: English by default, Ukrainian after `/buddy uk`.
type Lines = {
  idle: string[]
  done: string[]
  tool: { read: string; edit: string; shell: string; search: string; web: string; agent: string; other: string }
  thinking: string
  act: Partial<Record<Act, string[]>>
  grumble: string[]
  wake: string
  tooMany: string
  whatsThere: string
  greet: string[]
  putDown: string
  hop: string
  yawn: string
  tralala: string
}

const TEXT: Record<Lang, Lines> = {
  en: {
    idle: ['♪', '☕', 'hmm…', 'cozy here', '✿', 'beep-boop', '…', '★', 'poke me', 'so bored'],
    done: ['done!', 'yay ✦', 'all set', '✓'],
    tool: { read: 'reading a file 📖', edit: 'writing ✎', shell: 'tap-tap ⌨', search: 'searching 🔍', web: 'peeking at the web 🌐', agent: 'calling friends', other: 'working…' },
    thinking: 'thinking',
    act: {
      jump: ['hop!', 'oh!', 'eek!'],
      hearts: ['hee-hee ♥', 'purr~', 'more!'],
      spin: ['wheee!', 'spinning!'],
      squish: ['pfff', 'squishy!'],
      wave: ['hi!', 'hey!'],
      dance: ['♪ tss-tss ♪', 'disco!'],
      stretch: ['a-a-ah~', 'huh? what?'],
      land: ['oop!', 'landed'],
      found: ['found it ✦', 'there it is!'],
    },
    grumble: ['enough!', 'ow-ow', '💢'],
    wake: 'huh? what? 😳',
    tooMany: 'stop poking! 💢',
    whatsThere: 'ooh, what’s that?',
    greet: ['purr?', 'anyone there?', '👀'],
    putDown: 'hey, put me down!',
    hop: 'hop',
    yawn: 'a-a-ah~',
    tralala: 'tra-la-la',
  },
  uk: {
    idle: ['♪', '☕', 'хм…', 'тут затишно', '✿', 'біп-буп', '…', '★', 'тицьни мене', 'нудненько'],
    done: ['готово!', 'ура ✦', 'зроблено', '✓'],
    tool: { read: 'гортаю файл 📖', edit: 'пишу ✎', shell: 'тиць-тиць ⌨', search: 'шукаю 🔍', web: 'визираю в мережу 🌐', agent: 'кличу друзів', other: 'працюю…' },
    thinking: 'думаю',
    act: {
      jump: ['хоп!', 'ой!', 'ай!'],
      hearts: ['хі-хі ♥', 'мур~', 'ще!'],
      spin: ['уііі!', 'кручусь!'],
      squish: ['пфф', 'м’який!'],
      wave: ['привіт!', 'хей!'],
      dance: ['♪ тиц-тиц ♪', 'диско!'],
      stretch: ['а-а-ах~', 'а? що?'],
      land: ['оп!', 'приземлився'],
      found: ['знайшов ✦', 'ось воно!'],
    },
    grumble: ['ну годі!', 'ай-ай', '💢'],
    wake: 'а? що? 😳',
    tooMany: 'досить тицяти! 💢',
    whatsThere: 'о, що там?',
    greet: ['мур?', 'хтось тут?', '👀'],
    putDown: 'ей, постав мене!',
    hop: 'хоп',
    yawn: 'а-а-ах~',
    tralala: 'тра-ля-ля',
  },
}

// The language of the latest props (kept up to date on every draw).
const say = (): Lines => TEXT[latest.lang === 'uk' ? 'uk' : 'en']
const POKE_ACTS: Act[] = ['jump', 'hearts', 'spin', 'squish', 'jump', 'wave']
const ACT_LEN: Record<Act, number> = {
  none: 0, jump: 6, hearts: 14, spin: 12, squish: 8, wave: 12, dizzy: 26,
  dance: 20, stretch: 14, land: 4, found: 14,
}
const CONFETTI = ['✦', '★', '•', '✶', '◆']
const CONFETTI_COLORS = ['#F2C14E', '#7EE787', '#79C0FF', '#F2A0A0', '#D2A8FF']

function toolLine(tool: string): string {
  const t = say().tool
  if (tool === 'Read') return t.read
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return t.edit
  if (tool === 'Bash' || tool === 'PowerShell') return t.shell
  if (tool === 'Grep' || tool === 'Glob') return t.search
  if (tool.startsWith('WebFetch') || tool.startsWith('WebSearch') || tool.includes('Browser')) return t.web
  if (tool === 'Agent') return t.agent
  return t.other
}

function pick<T>(list: readonly T[], n: number): T {
  return list[Math.abs(Math.floor(n)) % list.length] as T
}

function isBusy(p: Props): boolean {
  return p.isWorking || p.mood === 'thinking' || p.mood === 'tool'
}

function maxXFor(columns: number): number {
  // Leave room for the speech bubble on the right.
  return Math.max(0, Math.min(columns - WIDTH - 24, 60))
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function isActive(s: State): boolean {
  return s.act !== 'none' && s.tick < s.actUntil
}

function isAsleep(s: State, busy: boolean): boolean {
  return !busy && s.tick - s.lastChange > 800 // ~2 minutes of quiet
}

function startAct(s: State, act: Act, line?: string): State {
  const next: State = {
    ...s,
    act,
    actStart: s.tick,
    actUntil: s.tick + ACT_LEN[act],
    lastChange: s.tick,
    pauseUntil: Math.max(s.pauseUntil, s.tick + ACT_LEN[act] + 4),
  }
  const lines = say().act[act]
  const text = line ?? (lines ? pick(lines, s.tick + s.pokes) : '')
  if (text) {
    next.say = text
    next.sayUntil = s.tick + Math.max(10, ACT_LEN[act])
  }
  if (act === 'hearts' || act === 'found') next.parts = [...s.parts, ...burst(s, ['♥', '♡', '♥'], ['#F2A0A0', '#E8677A'], 0.35, 12)]
  if (act === 'dance') next.parts = [...s.parts, ...burst(s, ['♪', '♫', '♪'], ['#D2A8FF', '#79C0FF'], 0.5, 16)]
  return next
}

function burst(s: State, chars: string[], colors: string[], speed: number, life: number): Particle[] {
  return chars.map((ch, i) => ({
    x: s.x + 2 + i * 4,
    dx: (i - (chars.length - 1) / 2) * speed,
    ch,
    color: pick(colors, i + s.tick),
    until: s.tick + life - i,
  }))
}

function confetti(s: State, columns: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < 8; i++) {
    out.push({
      x: clamp(s.x + 6 + (i - 4) * 2, 0, Math.max(0, columns - 2)),
      dx: (i - 3.5) * 0.45,
      ch: pick(CONFETTI, i * 3 + s.tick),
      color: pick(CONFETTI_COLORS, i + s.tick),
      until: s.tick + 10 + (i % 4) * 2,
    })
  }
  return out
}

// A poke on his body: cycle through reactions; many fast pokes make him dizzy.
function poke(s: State): State {
  const asleep = s.tick - s.lastChange > 800
  const clicks = [...s.clicks.filter(t => s.tick - t <= 12), s.tick]
  const prev = s.clicks[s.clicks.length - 1]
  let next: State = { ...s, clicks, pokes: s.pokes + 1, targetX: -1 }

  // While dizzy he ignores more pokes and just grumbles.
  if (s.act === 'dizzy' && isActive(s)) return { ...s, clicks: [], say: pick(say().grumble, s.tick), sayUntil: s.tick + 6 }
  if (asleep) return startAct(next, 'stretch', say().wake)
  if (clicks.length >= 6) return startAct({ ...next, clicks: [] }, 'dizzy', say().tooMany)
  if (prev !== undefined && s.tick - prev <= 2 && s.act !== 'dance') return startAct(next, 'dance')
  return startAct(next, pick(POKE_ACTS, s.pokes))
}

function onPointer(s: State, ev: ClientPointerEvent, columns: number): State {
  const maxX = maxXFor(columns)
  const hit = ev.x >= s.x && ev.x < s.x + BODY_W && ev.y >= 0 && ev.y < ROWS

  if (ev.type === 'down') {
    if (ev.button === 'right') return hit ? startAct(s, 'wave') : s
    if (ev.button === 'middle') return hit ? startAct(s, 'dance') : s
    if (hit) return { ...s, drag: { off: ev.x - s.x, startX: ev.x, moved: false }, lastChange: s.tick }
    // A click beside him: he runs over to see what is there.
    const targetX = clamp(ev.x - Math.floor(BODY_W / 2), 0, maxX)
    const marker: Particle = { x: clamp(ev.x, 0, Math.max(0, columns - 1)), dx: 0, ch: '✦', color: '#F2C14E', until: s.tick + 200, marker: true }
    return {
      ...s,
      targetX,
      parts: [...s.parts.filter(p => !p.marker), marker],
      lastChange: s.tick,
      act: 'none',
      say: say().whatsThere,
      sayUntil: s.tick + 10,
    }
  }

  if (ev.type === 'move') {
    if (s.drag && ev.button === 'left') {
      const moved = s.drag.moved || Math.abs(ev.x - s.drag.startX) >= 1
      const x = clamp(ev.x - s.drag.off, 0, maxX)
      return { ...s, x, dir: x >= s.x ? 1 : -1, drag: { ...s.drag, moved }, act: 'none', lastChange: s.tick }
    }
    const greet = hit && !s.hover && !isActive(s) && s.tick >= s.sayUntil
    return {
      ...s,
      lookX: ev.x,
      hover: hit,
      ...(greet ? { say: pick(say().greet, s.tick), sayUntil: s.tick + 8 } : {}),
    }
  }

  if (ev.type === 'up') {
    if (!s.drag) return s
    const wasMoved = s.drag.moved
    const released: State = { ...s, drag: null }
    return wasMoved ? startAct(released, 'land') : poke(released)
  }

  if (ev.type === 'leave') return { ...s, lookX: -1, hover: false }
  return s
}

function onKey(s: State, ev: ClientKeyEvent, columns: number): State {
  const maxX = maxXFor(columns)
  const k = ev.key.toLowerCase()
  if (k === 'left' || k === 'right') {
    const dir: 1 | -1 = k === 'left' ? -1 : 1
    return { ...s, dir, x: clamp(s.x + dir * 2, 0, maxX), targetX: -1, lastChange: s.tick, pauseUntil: s.tick + 12 }
  }
  if (k === ' ' || k === 'space' || k === 'up') return startAct(s, 'jump')
  if (k === 'h' || k === 'р') return startAct(s, 'hearts')
  if (k === 'd' || k === 'в') return startAct(s, 'dance')
  if (k === 's' || k === 'і') return startAct(s, 'spin')
  if (k === 'w' || k === 'ц') return startAct(s, 'wave')
  if (k === 'down') return startAct(s, 'squish')
  return s
}

// Only the tick changes the state; the latest props are kept here for it.
let latest: Props = { mood: 'idle', tool: '', seq: 0, isWorking: false, lang: 'en' }

type Frame = { rows: [string, string, string]; lift: 0 | 1; shake: number; tint: boolean; bubble?: string }

function frame(s: State, props: Props): Frame {
  const busy = isBusy(props)
  const asleep = isAsleep(s, busy)
  const t = s.tick - s.actStart
  const facing = (row: string) => (s.dir > 0 ? row : mirror(row))

  if (s.drag) {
    const legs = s.tick % 4 < 2 ? LEGS_DANGLE : mirror(LEGS_DANGLE)
    return { rows: [ARMS_UP, BODY_ARMS_UP, legs], lift: 1, shake: 0, tint: false, bubble: s.drag.moved ? say().putDown : undefined }
  }

  if (isActive(s)) {
    switch (s.act) {
      case 'jump':
      case 'land': {
        const len = ACT_LEN[s.act]
        const crouch = t === 0 || t === len - 1
        if (crouch || s.act === 'land') return { rows: [SQUISH_TOP, SQUISH_MID, SQUISH_LOW], lift: 0, shake: 0, tint: false }
        return { rows: [EYES_WIDE, BODY, LEGS_TUCK], lift: 1, shake: 0, tint: false }
      }
      case 'hearts':
      case 'found':
        return { rows: [t % 6 < 3 ? EYES_HAPPY : ARMS_UP_SHUT, t % 6 < 3 ? BODY : BODY_ARMS_UP, LEGS_STAND], lift: 0, shake: 0, tint: false }
      case 'spin': {
        const phase = t % 4
        const top = phase === 0 ? EYES_RIGHT : phase === 2 ? EYES_LEFT : BACK
        return { rows: [top, BODY, phase % 2 ? LEGS_STAND : mirror(LEGS_WALK[1] ?? LEGS_STAND)], lift: t % 4 === 1 ? 1 : 0, shake: 0, tint: false }
      }
      case 'squish':
        return t % 4 < 2
          ? { rows: [SQUISH_TOP, SQUISH_MID, SQUISH_LOW], lift: 0, shake: 0, tint: false }
          : { rows: [EYES_MID, BODY, LEGS_STAND], lift: 0, shake: 0, tint: false }
      case 'wave':
        return { rows: [t % 2 ? ARMS_UP : facing(' ###.##.##  '), t % 2 ? BODY_ARMS_UP : facing(' ##########  '.slice(0, 12)), LEGS_STAND], lift: 0, shake: 0, tint: false }
      case 'dance': {
        const beat = Math.floor(t / 2) % 4
        const top = beat % 2 ? ARMS_UP : EYES_HAPPY
        const mid = beat % 2 ? BODY_ARMS_UP : BODY
        const legs = beat === 1 ? (LEGS_WALK[1] ?? LEGS_STAND) : beat === 3 ? mirror(LEGS_WALK[1] ?? LEGS_STAND) : LEGS_STAND
        return { rows: [top, mid, legs], lift: beat === 0 && t % 2 === 1 ? 1 : 0, shake: beat === 1 ? 1 : beat === 3 ? -1 : 0, tint: false }
      }
      case 'dizzy':
        return { rows: [t % 2 ? EYES_ROLL : EYES_SHUT, BODY, LEGS_STAND], lift: 0, shake: t % 4 < 2 ? 1 : -1, tint: t > 6 && t < 18 }
      case 'stretch':
        return { rows: [ARMS_UP_SHUT, BODY_ARMS_UP, LEGS_STAND], lift: t > 3 && t < 10 ? 1 : 0, shake: 0, tint: false }
      default:
        break
    }
  }

  const done = s.tick < s.doneUntil
  const flap = done && Math.floor(s.tick / 2) % 2 === 0
  const running = s.targetX >= 0 && !busy
  const walking = running || (!busy && !asleep && s.tick >= s.pauseUntil)
  const blink = asleep || s.tick < s.blinkUntil

  // Look at the pointer when it hovers nearby.
  let gaze = busy ? EYES_RIGHT : walking ? (s.dir > 0 ? EYES_RIGHT : EYES_LEFT) : EYES_MID
  if (!walking && !busy && s.lookX >= 0) {
    const centre = s.x + BODY_W / 2
    gaze = s.hover ? EYES_HAPPY : s.lookX > centre + 1 ? EYES_RIGHT : s.lookX < centre - 1 ? EYES_LEFT : EYES_MID
  }
  const eyes = blink ? EYES_SHUT : gaze
  const top = flap ? ARMS_UP : eyes
  const mid = flap ? BODY_ARMS_UP : BODY
  const stepRow = pick(LEGS_WALK, running ? s.tick : Math.floor(s.tick / 2))
  const legs = walking ? (s.dir > 0 ? stepRow : mirror(stepRow)) : LEGS_STAND
  return { rows: [top, mid, legs], lift: 0, shake: 0, tint: false }
}

const Buddy: ClientModule<Props, State> = (props, surface) => {
  latest = props
  const { Box, Text } = surface.elements
  const s = surface.state

  if (s === undefined) {
    surface.setState({
      tick: 0, x: 2, dir: 1, pauseUntil: 12, blinkUntil: 0, say: '', sayUntil: 0,
      seenSeq: props.seq, lastChange: 0, doneUntil: 0, wasBusy: false, busySince: 0,
      act: 'none', actStart: 0, actUntil: 0, pokes: 0, clicks: [], parts: [],
      drag: null, lookX: -1, hover: false, targetX: -1,
    })
    surface.every(TICK_MS, () => {
      const cur = surface.state
      if (cur === undefined) return
      surface.setState(step(cur, latest, surface.columns))
    })
    surface.onPointer(ev => {
      const cur = surface.state
      if (cur === undefined) return
      surface.setState(onPointer(cur, ev, surface.columns))
    })
    surface.onKey(ev => {
      const cur = surface.state
      if (cur === undefined) return
      surface.setState(onKey(cur, ev, surface.columns))
    })
    return <Text> </Text>
  }

  const busy = isBusy(props)
  const asleep = isAsleep(s, busy)
  const f = frame(s, props)
  const x = Math.max(0, s.x + f.shake)

  // He pulls the laptop out when work starts and types on it while busy.
  const out = s.tick - s.busySince
  const laptop = !busy ? LAPTOP_HIDDEN : out < 4 ? LAPTOP_COMING : pick([LAPTOP_A, LAPTOP_B, LAPTOP_C], s.tick / 2)

  let bubble = ''
  if (f.bubble) bubble = f.bubble
  else if (isActive(s) && s.tick < s.sayUntil) bubble = s.say
  else if (asleep) bubble = pick(['z', 'z z', 'z z z'], s.tick / 6)
  else if (props.mood === 'tool') bubble = toolLine(props.tool)
  else if (busy) bubble = say().thinking + '.'.repeat(1 + (Math.floor(s.tick / 2) % 3))
  else if (s.tick < s.sayUntil) bubble = s.say

  const paint = (pattern: string) => (f.tint ? pattern.replace(/#/g, 'R') : pattern)

  const row = (pattern: string, key: string, extra?: string) => {
    const cells = []
    const src = paint(pattern)
    let i = 0
    while (i < src.length) {
      const ch = src[i] ?? ' '
      let j = i
      while (j < src.length && src[j] === ch) j++
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
        <Box width={x} height={1} />
        {cells}
        {extra ? <Text dimColor>{'  ' + extra}</Text> : null}
      </Box>
    )
  }

  // The sky row: hearts, notes, confetti, the ✦ he runs to, dizzy stars.
  const sky = (key: string) => {
    const items: { x: number; ch: string; color: string }[] = s.parts
      .filter(p => p.until > s.tick)
      .map(p => ({ x: Math.round(p.x), ch: p.ch, color: p.color }))
    if (s.act === 'dizzy' && isActive(s)) {
      const t = s.tick - s.actStart
      items.push({ x: s.x + 2 + (t % 8), ch: '✶', color: '#F2C14E' }, { x: s.x + 9 - (t % 8), ch: '@', color: '#79C0FF' })
    }
    if (asleep) items.push({ x: s.x + 10 + (Math.floor(s.tick / 8) % 3), ch: 'z', color: '#79C0FF' })
    const width = Math.max(1, surface.columns)
    const placed = items
      .filter(it => it.x >= 0 && it.x < width)
      .sort((a, b) => a.x - b.x)
    const nodes = []
    let cursor = 0
    for (const it of placed) {
      if (it.x < cursor) continue
      if (it.x > cursor) nodes.push(<Box key={key + 'g' + it.x} width={it.x - cursor} height={1} />)
      nodes.push(<Text key={key + 'c' + it.x} color={it.color}>{it.ch}</Text>)
      cursor = it.x + 1
    }
    return <Box key={key} flexDirection="row" height={1}>{nodes}</Box>
  }

  const [top, mid, low] = f.rows
  const body = [
    row(top + ' ' + (laptop[0] ?? ''), 't', bubble),
    row(mid + ' ' + (laptop[1] ?? ''), 'm'),
    row(low + ' ' + (laptop[2] ?? ''), 'l'),
  ]

  return (
    <Box flexDirection="column">
      {f.lift ? null : sky('sky')}
      {body}
      {f.lift ? row(SHADOW, 'sh') : null}
    </Box>
  )
}

function step(s: State, p: Props, columns: number): State {
  const tick = s.tick + 1
  let next: State = { ...s, tick }
  const busy = isBusy(p)
  const maxX = maxXFor(columns)

  if (busy && !s.wasBusy) next.busySince = tick
  next.wasBusy = busy

  // Particles drift and fade.
  next.parts = s.parts
    .filter(q => q.until > tick)
    .map(q => (q.dx ? { ...q, x: q.x + q.dx } : q))
    .slice(-24)

  if (s.act !== 'none' && tick >= s.actUntil) next.act = 'none'

  if (p.seq !== s.seenSeq) {
    next.seenSeq = p.seq
    next.lastChange = tick
    if (p.mood === 'done') {
      next.doneUntil = tick + 12
      next = startAct(next, 'jump', pick(say().done, tick))
      next.sayUntil = tick + 24
      next.parts = [...next.parts, ...confetti(next, columns)]
    }
  }

  // Blink now and then.
  if (tick % 34 === 0 || (tick * 7) % 107 === 0) next.blinkUntil = tick + 2

  if (next.drag || isActive(next)) {
    // Held or busy reacting: stay put.
  } else if (next.targetX >= 0 && !busy) {
    // Run to the ✦ the person clicked.
    if (next.x === next.targetX) {
      next.targetX = -1
      next.parts = next.parts.filter(q => !q.marker)
      next = startAct(next, 'found')
    } else {
      next.dir = next.targetX > next.x ? 1 : -1
      next.x = clamp(next.x + next.dir, 0, maxX)
    }
  } else if (!busy && tick - next.lastChange <= 800) {
    // Wander: walk a few steps, then stop and look around.
    if (tick >= s.pauseUntil && tick % 2 === 0 && s.lookX < 0) {
      let x = s.x + s.dir
      let dir = s.dir
      if (x >= maxX) { x = maxX; dir = -1 }
      if (x <= 0) { x = 0; dir = 1 }
      next.x = x
      next.dir = dir
      if ((tick * 13) % 59 === 0) next.pauseUntil = tick + 16 + (tick % 24)
    }
    // Little things he does on his own.
    // (They keep his sleep timer: only the person or Claude wakes him.)
    const quiet = next.lastChange
    if ((tick * 7) % 263 === 0) next = { ...startAct(next, 'jump', say().hop), lastChange: quiet }
    else if ((tick * 5) % 409 === 0) next = { ...startAct(next, 'stretch', say().yawn), lastChange: quiet }
    else if ((tick * 3) % 521 === 0) next = { ...startAct(next, 'spin', say().tralala), lastChange: quiet }
    else if (tick >= s.sayUntil && (tick * 11) % 197 === 0) {
      // A quiet remark, rarely.
      next.say = pick(say().idle, tick)
      next.sayUntil = tick + 20
    }
  } else if (next.x > maxX) {
    next.x = maxX
  }

  return next
}

export default Buddy
