import type { TextmodePlugin, Textmodifier } from 'textmode.js';
import packageMetadata from '../package.json';
import { TextmodeOverlayControllerImpl } from './TextmodeOverlayController';

const controllers = new WeakMap<Textmodifier, TextmodeOverlayControllerImpl>();

/**
 * Installs an isolated overlay controller on each textmode.js instance.
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
	name: 'textmode.overlay',
	version: packageMetadata.version,

	install(textmodifier, context) {
		controllers.get(textmodifier)?.dispose();
		const controller = new TextmodeOverlayControllerImpl(textmodifier, context);
		controllers.set(textmodifier, controller);
		context.defineExtension('textmodifier', 'overlay', {
			get() {
				return controller;
			},
		});
	},

	uninstall(textmodifier) {
		controllers.get(textmodifier)?.dispose();
		controllers.delete(textmodifier);
	},
};
