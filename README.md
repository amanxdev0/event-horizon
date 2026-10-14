<div align="center">

# 🕳️ EVENT HORIZON

**A scroll-driven 3D dive into the heart of a black hole.**

From deep space into the singularity — scroll is the playhead as seven chapters carry the camera from a distant view of the accretion disk, through the photon sphere, across the event horizon, and down to the end of the map. Every word on top is real HTML.

[![live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://amanxdev0.github.io/event-horizon/)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-%5E0.160.0-black?style=flat-square)](https://threejs.org/)

[Live demo](https://amanxdev0.github.io/event-horizon/) · [Report a bug](https://github.com/amanxdev0/event-horizon/issues)

</div>

---

## The journey

| # | Chapter | Zone |
|---|---------|------|
| 1 | The Void Between Stars | DEEP SPACE |
| 2 | The Ring of Fire | ACCRETION DISK |
| 3 | Where Light Itself Orbits | PHOTON SPHERE |
| 4 | The Edge of Forever | POINT OF NO RETURN |
| 5 | Crossing | EVENT HORIZON |
| 6 | Stretched Thin | SPAGHETTIFICATION |
| 7 | The End of the Map | SINGULARITY |

## What's in the 3D scene

- **Custom GLSL accretion-disk shader** — heat gradient, turbulent streaks, doppler beaming
- **Faked gravitational lensing** — light arcs bent over and under the horizon sphere
- **Photon sphere** — the shell where light itself orbits
- **Spaghettification stretch** as tidal forces take hold past the horizon
- Film HUD: zone label, live **distance-to-singularity ticker**, progress bar, FPS meter

## The tech

- **Three.js** (r160, via CDN import map — no build step)
- Damped scroll playhead: `smoothP += (targetP − smoothP) · (1 − e^(−dt·5.5))` — frame-rate independent, so janky scroll input renders as smooth film
- Chapters measured from the real DOM layout, so text and camera can never desync
- Camera flies between per-chapter stops with smoothstep easing
- Adaptive pixel ratio: steps down when FPS sags, recovers when it heals
- `prefers-reduced-motion` → still frame · no WebGL → friendly fallback message

## Run it

Any static server works — no video files, no build step:

```bash
cd event-horizon
python3 -m http.server 8000
# → http://localhost:8000
```

Or enable **GitHub Pages**: repo Settings → Pages → Deploy from branch → `main` / root.

## The Scroll Series

Part of Aman Singh's scroll-driven cinematic universe — real HTML floating over live 3D films, where scroll is the playhead:

- [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) — the original cinematic WebGL film + full reverse-engineering breakdown
- [HELIOS](https://amanxdev0.github.io/helios/) — scroll from the Milky Way to Pluto
- [ABYSS](https://amanxdev0.github.io/abyss/) — descend through the five ocean zones to Challenger Deep
- [EVENT HORIZON](https://amanxdev0.github.io/event-horizon/) — dive into the heart of a black hole
- [RAMAYANA](https://amanxdev0.github.io/ramayana/) — a 3D flight through the Valmiki Ramayana

Built with the [scrollfilm engine](https://github.com/amanxdev0/scrollfilm) — make your own.

## License

MIT © Aman Singh
