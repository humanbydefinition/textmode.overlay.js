/**
 * @packageDocumentation
 * DOM overlay target capture and geometry synchronization for textmode.js.
 */

import './augmentations';

export { OverlayPlugin } from './OverlayPlugin';
export type { TextmodeOverlayController, TextmodeOverlayTarget } from './types';

import { OverlayPlugin } from './OverlayPlugin';
import type { TextmodePlugin } from 'textmode.js';

declare global {
	interface Window {
		OverlayPlugin?: TextmodePlugin;
	}
}

if (typeof window !== 'undefined') window.OverlayPlugin = OverlayPlugin;
