import type { TextmodePlugin } from 'textmode.js';
import packageMetadata from '../package.json';
import { TextmodeOverlayControllerImpl } from './runtime/TextmodeOverlayController';

/**
 * Installs an isolated overlay controller on each textmode.js instance.
 *
 * @category Workflow
 *
 * @example
 * ```ts
 * const t = textmode.create({ plugins: [OverlayPlugin] });
 * t.overlay.setTarget(document.querySelector('canvas'));
 * ```
 *
 * @see {@link https://code.textmode.art/api/textmode.overlay.js/variables/OverlayPlugin | OverlayPlugin API reference}
 */
export const OverlayPlugin: TextmodePlugin = {
	name: packageMetadata.name,

	install(textmodifier, context) {
		const controller = new TextmodeOverlayControllerImpl(textmodifier);
		const unregisterPostDraw = context.on('postDraw', () => controller.requestSynchronization());
		try {
			context.defineExtension('textmodifier', 'overlay', {
				get() {
					return controller;
				},
			});
		} catch (error) {
			controller.dispose();
			unregisterPostDraw();
			throw error;
		}
		return () => {
			controller.dispose();
			unregisterPostDraw();
		};
	},
};
