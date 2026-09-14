/**
 * @packageDocumentation
 *
 * DOM overlay target capture and geometry synchronization for textmode.js.
 *
 * ## Sketch workflow
 *
 * 1. Add {@link OverlayPlugin} to the sketch's plugins.
 * 2. Bind a live canvas or video with `t.overlay.setTarget()`.
 * 3. Shape the returned texture with the standard character, color, conversion,
 *    and transform settings.
 * 4. Show, hide, or toggle the output canvas while drawing continues.
 *
 * @categoryDescription Workflow
 * The plugin that installs the overlay controller on textmode.js layers.
 *
 * @categoryDescription Overlay controller
 * The per-instance controller that samples a target and keeps the output aligned.
 *
 * @categoryDescription Target types
 * The live browser media elements the overlay can sample.
 *
 * @showCategories
 */

import './augmentations';
import type { TextmodePlugin } from 'textmode.js';
import { OverlayPlugin } from './OverlayPlugin';

export { OverlayPlugin };
export type { TextmodeOverlayController, TextmodeOverlayTarget } from './types';

declare global {
	interface Window {
		OverlayPlugin?: TextmodePlugin;
	}
}

if (typeof window !== 'undefined') window.OverlayPlugin = OverlayPlugin;
