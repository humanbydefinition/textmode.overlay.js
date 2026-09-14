# textmode.overlay.js

<div align="center">

<img alt="textmode.overlay.js — overlay textmode above any target" src=".github/assets/readme-og.png" />

| [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) | [![API](https://img.shields.io/badge/API-typedoc-3178c6?logo=typescript&logoColor=white)](https://code.textmode.art/api/textmode.overlay.js/) [![docs](https://img.shields.io/badge/docs-vitepress-646cff?logo=vitepress&logoColor=white)](https://code.textmode.art/) | [![ko-fi](https://shields.io/badge/ko--fi-donate-ff5f5f?logo=ko-fi)](https://ko-fi.com/V7V8JG2FY) [![GitHub-sponsors](https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/humanbydefinition) |
|:---|:---|:---|

</div>

`textmode.overlay.js` is the official target-overlay add-on for [`textmode.js`](https://github.com/humanbydefinition/textmode.js), giving a live canvas or video element a textmode twin. The output canvas renders directly on top of the target and stays pinned there through resizes, scrolling, and window changes — so the textmode view tracks the element as the page moves.

Bind a target once with `t.overlay.setTarget()`, then sample it with the same character, color, conversion, and transform settings as any other source. Show, hide, or toggle the overlay independently while drawing continues, retarget freely between elements, or leave a target detached until it mounts - the add-on owns the geometry and DOM lifecycle so you can focus on the composition.

## Features

- **Synchronous target binding** - `setTarget()` runs immediately after `textmode.create()` and returns a fully configurable `TextmodeTexture`
- **Live canvas and video sampling** - Sample HTMLCanvasElement or HTMLVideoElement targets through the standard character, color, conversion, and transform settings
- **Frame-coalesced geometry sync** - Target resize, captured scroll, window resize, video metadata, and post-draw notifications settle into one animation frame
- **DOM lifecycle ownership** - Clearing or uninstalling the plugin restores the output canvas to its original DOM location and modified inline styles
- **Disconnected-target watching** - Targets are watched until they are mounted into the document
- **Output visibility controls** - Show, hide, and toggle only the output canvas while sampling and sketch execution continue
- **Axis-aligned positioning** - Rotated or skewed CSS targets are rejected rather than approximated

## Installation

Follow the [official installation guide](https://code.textmode.art/docs/installation) to install
`textmode.overlay.js` alongside `textmode.js` with npm or browser-ready UMD bundles.

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

## Migration from core overlay mode

In `textmode.js` 0.18, the built-in `{ overlay: true }` target-overlay mode was extracted into this add-on. Use the table below to update an existing sketch.

| Before | After |
| --- | --- |
| `textmode.create({ canvas: target, overlay: true })` | `textmode.create({ plugins: [OverlayPlugin] })` |
| `t.overlay` as the sampled image | `t.overlay.setTarget(target)`; read the sampled `TextmodeTexture` from `t.overlay.source` |
| Target following owned by core | Controller lifecycle owned by the add-on |
| Available without installing anything | Install and import `textmode.overlay.js` |

## Next steps

- **[Read the documentation](https://code.textmode.art/)** for core concepts and plugin workflows.
- **[Browse the API reference](https://code.textmode.art/api/textmode.overlay.js/)** for the complete controller and plugin API.
- **[Explore the examples](./examples/)** to see canvas, video, retargeting, and visibility patterns in action.

## Contributing

Thank you for considering contributing to this project! (✿◠‿◠)

Please read the [Contributing Guide](./CONTRIBUTING.md) to get started.

<!-- TEXTMODE-CONTRIBUTORS:START -->
<!-- prettier-ignore-start -->
<!-- Generated from https://github.com/humanbydefinition/code.textmode.art/blob/main/.vitepress/data/contributors.json and https://github.com/humanbydefinition/code.textmode.art/blob/main/.vitepress/data/contribution-types.json. Do not edit this section directly. -->
## Contributors

Thanks to the people who contribute code, documentation, design, examples, ideas, infrastructure, and care
across the textmode.js ecosystem.

<!-- markdownlint-disable MD033 -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/humanbydefinition">
          <img src="https://github.com/humanbydefinition.png?s=100" width="100px" alt="humanbydefinition avatar" />
          <br /><sub><b>humanbydefinition</b></sub>
        </a>
        <br /><span title="Code: Commits and pull requests" aria-label="Code: Commits and pull requests">💻</span> <span title="Documentation: README, guides, and API documentation" aria-label="Documentation: README, guides, and API documentation">📖</span> <span title="Design: User experience, branding, and visual design" aria-label="Design: User experience, branding, and visual design">🎨</span> <span title="Examples: Usage examples and creative sketches" aria-label="Examples: Usage examples and creative sketches">💡</span> <span title="Ideas and planning: Feature proposals, planning, and feedback" aria-label="Ideas and planning: Feature proposals, planning, and feedback">🤔</span> <span title="Maintenance: Refactoring and project upkeep" aria-label="Maintenance: Refactoring and project upkeep">🚧</span> <span title="Infrastructure: Continuous integration, hosting, and build systems" aria-label="Infrastructure: Continuous integration, hosting, and build systems">🚇</span> <span title="Tools: Developer and community tooling" aria-label="Tools: Developer and community tooling">🔧</span> <span title="Plugins and libraries: Plugin and utility library development" aria-label="Plugins and libraries: Plugin and utility library development">🔌</span> <span title="Code review: Reviewing pull requests" aria-label="Code review: Reviewing pull requests">👀</span>
      </td>
      <td align="center" valign="top" width="14.28%">
        <a href="https://github.com/trintlermint">
          <img src="https://github.com/trintlermint.png?s=100" width="100px" alt="trintlermint avatar" />
          <br /><sub><b>trintlermint</b></sub>
        </a>
        <br /><span title="Design: User experience, branding, and visual design" aria-label="Design: User experience, branding, and visual design">🎨</span> <span title="Examples: Usage examples and creative sketches" aria-label="Examples: Usage examples and creative sketches">💡</span>
      </td>
    </tr>
  </tbody>
</table>
<!-- markdownlint-enable MD033 -->

Contribution details and profile links are maintained on the [textmode.js contributors page](https://code.textmode.art/docs/contributors).
<!-- prettier-ignore-end -->
<!-- TEXTMODE-CONTRIBUTORS:END -->

## License

`textmode.overlay.js` is licensed under the [MIT License](./LICENSE).
