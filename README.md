# textmode.overlay.js

`textmode.overlay.js` is the official target-overlay add-on for `textmode.js` 0.18.x. It samples a live canvas or video through the core texture API, places the core-owned output canvas directly above that target, and keeps their geometry synchronized.

The package has no runtime dependencies. `textmode.js` is a peer dependency.

## Install

```bash
npm install textmode.js textmode.overlay.js
```

## Usage

```ts
import { textmode } from 'textmode.js';
import { OverlayPlugin } from 'textmode.overlay.js';

const t = textmode.create({
	plugins: [OverlayPlugin],
});

const source = t.overlay.setTarget(sourceCanvas);
source.characters(' .:-=+*#%@').charColorMode('sampled');

t.draw(() => {
	t.image(t.overlay.source!, t.grid.cols, t.grid.rows);
});
```

`setTarget()` is synchronous and can run immediately after `textmode.create()`. The returned `TextmodeTexture` supports the normal character, color, conversion, and transform settings.

## Controller

```ts
interface TextmodeOverlayController {
	readonly target: HTMLCanvasElement | HTMLVideoElement | undefined;
	readonly source: TextmodeTexture | undefined;

	setTarget(target: HTMLCanvasElement | HTMLVideoElement): TextmodeTexture;
	clearTarget(): void;
	show(): void;
	hide(): void;
	toggle(): void;
	isVisible(): boolean;
}
```

- Rebinding the same target preserves its texture and schedules a geometry check.
- Rebinding another target disposes the previous texture and observers first.
- `clearTarget()` and plugin uninstall restore the output canvas's original DOM location and modified inline styles.
- Hiding affects only the output canvas. The sketch and source capture continue.
- Pointer events remain enabled on the output. For click-through interaction, set `t.canvas.style.pointerEvents = 'none'` after binding.
- Canvas backing dimensions and video intrinsic dimensions are used when layout reports a zero-sized target.
- Disconnected targets are watched until they are mounted.

Geometry synchronization coalesces target resize, captured scroll, window resize, video metadata/resize, and post-draw notifications into one animation frame. It compares rounded geometry before resizing core framebuffers, avoiding observer feedback loops and redundant GPU work.

Axis-aligned positioning and scaling are supported. Rotated or skewed CSS targets are rejected in version 1 because a sibling canvas cannot reproduce arbitrary transformed geometry without approximation.

## Migration from core overlay mode

| Before                              | After                                                             |
| ----------------------------------- | ----------------------------------------------------------------- |
| `{ canvas: target, overlay: true }` | `{ plugins: [OverlayPlugin] }` then `t.overlay.setTarget(target)` |
| `t.overlay` as the sampled image    | `t.overlay.source` as the sampled `TextmodeTexture`               |
| Core-owned target following         | Add-on-owned controller lifecycle                                 |
| Built-in availability               | Install/import `textmode.overlay.js`                              |

The core `BLEND_OVERLAY` layer blend mode and built-in loading/error displays are unrelated and remain in `textmode.js`.

## Browser script

The UMD bundle exposes both `textmodeOverlay.OverlayPlugin` and `window.OverlayPlugin`.

## Development

Node.js 24 and npm 11 are the supported development environment.

```bash
npm install
npm run check
```

## License

MIT
