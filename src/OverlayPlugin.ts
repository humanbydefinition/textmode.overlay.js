import type { TextmodePlugin, Textmodifier } from 'textmode.js';
import packageMetadata from '../package.json';
import { TextmodeOverlayControllerImpl } from './runtime/TextmodeOverlayController';

interface OverlayInstallation {
	dispose(): void;
}

const installations = new WeakMap<Textmodifier, OverlayInstallation>();

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
	name: 'textmode.overlay',
	version: packageMetadata.version,

	install(textmodifier, context) {
		installations.get(textmodifier)?.dispose();
		const controller = new TextmodeOverlayControllerImpl(textmodifier);
		const unregisterPostDraw = context.on('postDraw', () => controller.requestSynchronization());
		let disposed = false;
		const installation: OverlayInstallation = {
			dispose() {
				if (disposed) return;
				disposed = true;
				try {
					controller.dispose();
				} finally {
					unregisterPostDraw();
				}
			},
		};
		installations.set(textmodifier, installation);
		try {
			context.defineExtension('textmodifier', 'overlay', {
				get() {
					return controller;
				},
			});
		} catch (error) {
			installations.delete(textmodifier);
			installation.dispose();
			throw error;
		}
	},

	uninstall(textmodifier) {
		const installation = installations.get(textmodifier);
		if (!installation) return;
		try {
			installation.dispose();
		} finally {
			installations.delete(textmodifier);
		}
	},
};
