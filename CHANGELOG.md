# Changelog

## 1.1.0

- Keep overlays aligned through positive axis-aligned scaling, translation, CSS `zoom`, and scrolling across the target's ancestor chain.
- Pass pointer events through overlays by default. Set `pointerEvents: 'auto'` in `setTarget()` when the overlay must receive input.
- Reject unsupported rotation, skew, reflection, collapsed axes, 3D projection, and output-canvas borders, padding, or transforms with clear errors.
- Improve retargeting and cleanup so failed bindings restore the output canvas and previous DOM state.
