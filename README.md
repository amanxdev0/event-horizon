# EVENT HORIZON

A cinematic scroll-driven 3D dive from deep space into the heart of a black hole — built with Three.js. Scroll is the playhead: seven chapters carry the camera from a distant view of the accretion disk, through the photon sphere, across the event horizon, and down to the singularity.

Live: https://amanxdev0.github.io/event-horizon/

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

## Tech

- **Three.js** (r160, via CDN import map — no build step)
- Damped scroll playhead: `smoothP += (targetP − smoothP) · (1 − e^(−dt·5.5))` — frame-rate independent, so janky scroll input renders as smooth film
- Chapters measured from the real DOM layout, so text and camera can never desync
- Camera flies between per-chapter stops with smoothstep easing
- Custom GLSL accretion-disk shader: heat gradient, turbulent streaks, doppler beaming
- Faked gravitational lensing: light arcs bent over/under the horizon sphere
- Film HUD: zone label, live distance-to-singularity ticker, progress bar, FPS meter
- Adaptive pixel ratio: steps down when FPS sags, recovers when it heals
- `prefers-reduced-motion` → still frame · no WebGL → friendly fallback message

## Run locally

Any static server works:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

```
index.html          — chapters + HUD + fallbacks
css/style.css       — dark cinematic theme, readability scrims
js/horizon.js       — the whole engine + scene
```

## License

MIT © 2026 Aman Singh
