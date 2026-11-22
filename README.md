# Midnight Vault — a stealth heist game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/sosissausage35-collab/best-heist-game-20261122/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/sosissausage35-collab/best-heist-game-20261122/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game for the make.fun bounty
[Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559).
You are the thief. Slip past patrolling guards and their vision cones, dodge
the sweeping wall cameras, crack the vault, grab the diamond, and walk out
the exit — without raising the alarm.

## How to play

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, harder to spot)
- **Click on the floor** — throw a noise coin; nearby guards leave their patrol to investigate it
- **P** — pause · **M** — mute · **Space / click** — start, next level, retry

Grab coins (+100) and loot bags (+250) on the way; the diamond is worth
+1000. Clearing a level pays +500, plus +300 if nobody ever saw you. Three
levels, three lives. If the alarm meter hits 100 the guards hunt you down,
and if one catches you, you lose a life and wake up back at the entrance.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

The game is plain static files under `game/` — no build step, no network
request, no library. `main.ts` (Node 22) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game itself, staged deterministically
with `?shot=start|play|end&seed=1` (see `shots.json`).

## Files

- `game/index.html` — the page; `game/src/` — the whole game, ES modules
- `main.ts` — the program that hands the game in
- `serve.ts` — a tiny static server for local play-testing
- `shots.json` — the three screenshot scenes
- `screenshots/` — the three screenshots
- `vendor/makefun-game.ts` — make.fun's dossier library, copied unchanged

## License

MIT. See `LICENSE`.

Built for make.fun — https://make.fun/r/f4pc3mbd
