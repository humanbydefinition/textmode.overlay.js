import 'textmode.js';
import type { TextmodeOverlayController } from './types';

declare module 'textmode.js' {
	interface Textmodifier {
		/** Controller installed by {@link OverlayPlugin}. */
		readonly overlay: TextmodeOverlayController;
	}
}

export {};
