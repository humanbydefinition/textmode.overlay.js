import type { TextmodeTexture } from 'textmode.js';

/**
 * A live browser media element that can be sampled by the overlay controller.
 *
 * @category Target types
 *
 * @see {@link https://code.textmode.art/api/textmode.overlay.js/type-aliases/TextmodeOverlayTarget | TextmodeOverlayTarget API reference}
 */
export type TextmodeOverlayTarget = HTMLCanvasElement | HTMLVideoElement;

/**
 * Pointer-event policy for the output canvas.
 *
 * Overlays default to `'none'` so page interaction continues through them;
 * opt into `'auto'` when the overlay itself must receive pointer input.
 *
 * @category Target types
 *
 * @see {@link https://code.textmode.art/api/textmode.overlay.js/type-aliases/TextmodeOverlayPointerEvents | TextmodeOverlayPointerEvents API reference}
 */
export type TextmodeOverlayPointerEvents = 'auto' | 'none';

/**
 * Options accepted when binding a target.
 *
 * @category Target binding
 *
 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlaySetTargetOptions | TextmodeOverlaySetTargetOptions API reference}
 */
export interface TextmodeOverlaySetTargetOptions {
	/**
	 * Pointer-event policy applied to the output canvas.
	 *
	 * @default 'none'
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlaySetTargetOptions#pointerevents | pointerEvents API reference}
	 */
	pointerEvents?: TextmodeOverlayPointerEvents;
}

/**
 * Controls the sampled target and DOM alignment for one textmode.js instance.
 *
 * The controller never owns the output canvas. Clearing or uninstalling the plugin
 * restores the canvas to its original DOM location and inline styles.
 *
 * @category Overlay controller
 *
 * @categoryDescription Controller state
 * The current sampled target, its configurable texture source, and output visibility state.
 *
 * @categoryDescription Target binding
 * Attach a target to sample and release it to restore the output canvas.
 *
 * @categoryDescription Visibility
 * Show, hide, and toggle only the output canvas while sampling continues.
 *
 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController | TextmodeOverlayController API reference}
 */
export interface TextmodeOverlayController {
	/**
	 * The currently sampled canvas or video.
	 *
	 * @category Controller state
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#target | TextmodeOverlayController.target API reference}
	 */
	readonly target: TextmodeOverlayTarget | undefined;

	/**
	 * The configurable texture created from {@link target}.
	 *
	 * @category Controller state
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#source | TextmodeOverlayController.source API reference}
	 */
	readonly source: TextmodeTexture | undefined;

	/**
	 * Sample a target and align the textmode output canvas above it.
	 *
	 * Positive axis-aligned scale and translation, CSS `zoom`, and scrolling are
	 * supported on the target and its ancestors. Rotation, skew, reflection,
	 * collapsed axes, 3D projection, and output-canvas transform/border/padding
	 * are rejected.
	 *
	 * @category Target binding
	 *
	 * @param target Canvas or video to sample.
	 * @param options Binding options, including the output canvas pointer-event policy.
	 * @returns The configurable texture source.
	 * @throws {TypeError | Error} When the target kind or target/output geometry cannot be represented by an axis-aligned canvas.
	 *
	 * @example
	 * ```ts
	 * // Pointer input passes through the overlay by default.
	 * const source = t.overlay.setTarget(canvas);
	 * source.characters(' .:-=+*#%@');
	 *
	 * // Opt in when textmode.js mouse handlers should receive the input.
	 * t.overlay.setTarget(canvas, { pointerEvents: 'auto' });
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#settarget | TextmodeOverlayController.setTarget API reference}
	 */
	setTarget(target: TextmodeOverlayTarget, options?: TextmodeOverlaySetTargetOptions): TextmodeTexture;

	/**
	 * Stop sampling and restore the output canvas.
	 *
	 * @category Target binding
	 *
	 * @example
	 * ```ts
	 * t.overlay.clearTarget();
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#cleartarget | TextmodeOverlayController.clearTarget API reference}
	 */
	clearTarget(): void;

	/**
	 * Show the output canvas and request a fresh geometry synchronization.
	 *
	 * @category Visibility
	 *
	 * @example
	 * ```ts
	 * t.overlay.show();
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#show | TextmodeOverlayController.show API reference}
	 */
	show(): void;

	/**
	 * Hide only the output canvas. Sampling and sketch execution continue.
	 *
	 * @category Visibility
	 *
	 * @example
	 * ```ts
	 * t.overlay.hide();
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#hide | TextmodeOverlayController.hide API reference}
	 */
	hide(): void;

	/**
	 * Toggle output-canvas visibility.
	 *
	 * @category Visibility
	 *
	 * @example
	 * ```ts
	 * t.overlay.toggle();
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#toggle | TextmodeOverlayController.toggle API reference}
	 */
	toggle(): void;

	/**
	 * Report the controller's intended output visibility.
	 *
	 * @category Visibility
	 *
	 * @returns Whether the output canvas is shown.
	 *
	 * @example
	 * ```ts
	 * if (t.overlay.isVisible()) t.overlay.hide();
	 * ```
	 *
	 * @see {@link https://code.textmode.art/api/textmode.overlay.js/interfaces/TextmodeOverlayController#isvisible | TextmodeOverlayController.isVisible API reference}
	 */
	isVisible(): boolean;
}
