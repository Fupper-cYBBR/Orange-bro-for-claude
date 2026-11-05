# Orange Buddy 🟠

**English** · [Українська](README.uk.md)

A small orange pixel companion that lives above the Claude Code prompt. It wanders around, blinks, pulls out a laptop while Claude is working, says what tool is running and celebrates with confetti when the turn is done.

Two versions are in this repository. Install one of them (both use the `/buddy` command):

| Plugin | What it does |
| --- | --- |
| `orange-buddy-click` | The full buddy: poke it, drag it, click beside it so it runs to the spot, right/middle-click, arrow keys, `space`, `h`, `d`, `s`, `w`. Too many pokes make it dizzy. |
| `orange-buddy-calm` | A calm version with no click or keyboard animations: it just wanders, blinks and reacts to Claude's work. |

`/buddy` hides or shows the companion.

## Language

The buddy speaks English by default. It also speaks Ukrainian, its original language:

```
/buddy uk
```

`/buddy en` switches back. The choice is remembered between sessions.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install orange-buddy-click --marketplace Fupper-cYBBR/orange-buddy
```

or, for the calm version:

```
/plugin install orange-buddy-calm --marketplace Fupper-cYBBR/orange-buddy
```

From a shell:

```bash
claude plugin install orange-buddy-click --marketplace Fupper-cYBBR/orange-buddy
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `Fupper-cYBBR/orange-buddy`, then Add plugin.

Answer `y` to add the marketplace, then pick a scope.

## License

MIT
