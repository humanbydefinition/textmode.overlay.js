import type {} from 'textmode.js/addon';
import type { TextmodeOverlayController } from './types';

declare module 'textmode.js/addon' {
	interface TextmodifierExtensions {
		/** Controller installed by {@link OverlayPlugin}. */
		readonly overlay: TextmodeOverlayController;
	}
}

export {};
