import type { TextmodeOverlayTarget } from '../types';

/** @internal */
export const ERROR_PREFIX = '[textmode.overlay.js]';
const AXIS_ALIGNMENT_TOLERANCE = 1e-8;
const UNSUPPORTED_TRANSFORM_MESSAGE = `${ERROR_PREFIX} Only finite, positive, axis-aligned transforms are supported. Rotations, skew, reflections, and collapsed axes are not supported.`;
const UNSUPPORTED_OUTPUT_BOX_MESSAGE = `${ERROR_PREFIX} The textmode output canvas cannot have its own transform, border, or padding while used as an overlay.`;

/**
 * Internal immutable geometry value used by the synchronizer.
 *
 * @internal
 */
export type OverlayGeometry = Readonly<{
	left: number;
	top: number;
	width: number;
	height: number;
}>;

/**
 * Local coordinate space of the output canvas, relative to the viewport.
 *
 * `scale` converts a local CSS pixel into a viewport pixel, and `origin` is the
 * viewport position of the output canvas's local `(0, 0)`. The pair lets the
 * synchronizer express a target's viewport rectangle in the output canvas's own
 * CSS pixel space, so ancestor transforms and CSS `zoom` are only applied once.
 *
 * @internal
 */
export type OverlayCoordinateSpace = Readonly<{
	scaleX: number;
	scaleY: number;
	originLeft: number;
	originTop: number;
}>;

/**
 * Validate a target and preserve the package's public error contract.
 *
 * @internal
 */
export function assertValidTarget(target: unknown, output: HTMLCanvasElement): asserts target is TextmodeOverlayTarget {
	const isCanvas = typeof HTMLCanvasElement !== 'undefined' && target instanceof HTMLCanvasElement;
	const isVideo = typeof HTMLVideoElement !== 'undefined' && target instanceof HTMLVideoElement;
	if (!isCanvas && !isVideo) {
		throw new TypeError(`${ERROR_PREFIX} setTarget() requires an HTMLCanvasElement or HTMLVideoElement.`);
	}
	if (target === output) {
		throw new TypeError(`${ERROR_PREFIX} The textmode output canvas cannot be used as its own overlay target.`);
	}
	assertSupportedTransformChain(target);
}

/**
 * Validate output-canvas box assumptions before a binding mutates DOM or texture state.
 *
 * @internal
 */
export function assertValidOutputCanvas(output: HTMLCanvasElement): void {
	assertSupportedOutputBox(getComputedStyle(output));
}

/**
 * Reject transforms that cannot be represented by axis-aligned overlay geometry.
 *
 * @internal
 */
export function assertAxisAlignedTransform(transform: string): void {
	if (!transform || transform === 'none') return;

	const matrix = /^matrix\(([^)]+)\)$/.exec(transform);
	if (matrix) {
		const values = matrix[1].split(',').map(Number);
		if (
			values.length === 6 &&
			values.every(Number.isFinite) &&
			values[0] > AXIS_ALIGNMENT_TOLERANCE &&
			values[3] > AXIS_ALIGNMENT_TOLERANCE &&
			Math.abs(values[1]) <= AXIS_ALIGNMENT_TOLERANCE &&
			Math.abs(values[2]) <= AXIS_ALIGNMENT_TOLERANCE
		) {
			return;
		}
	}

	const matrix3d = /^matrix3d\(([^)]+)\)$/.exec(transform);
	if (matrix3d) {
		const values = matrix3d[1].split(',').map(Number);
		const offAxis = [1, 2, 3, 4, 6, 7, 8, 9, 11, 14];
		if (
			values.length === 16 &&
			values.every(Number.isFinite) &&
			values[0] > AXIS_ALIGNMENT_TOLERANCE &&
			values[5] > AXIS_ALIGNMENT_TOLERANCE &&
			Math.abs(values[10] - 1) <= AXIS_ALIGNMENT_TOLERANCE &&
			Math.abs(values[15] - 1) <= AXIS_ALIGNMENT_TOLERANCE &&
			offAxis.every((index) => Math.abs(values[index]) <= AXIS_ALIGNMENT_TOLERANCE)
		) {
			return;
		}
	}

	throw new Error(UNSUPPORTED_TRANSFORM_MESSAGE);
}

/**
 * Measure a target's rendered rectangle in viewport coordinates.
 *
 * Transform contributions from the target and its ancestors are included, which
 * is exactly what the output canvas must visually match. Falls back to the
 * target's intrinsic dimensions when the layout rectangle collapses to zero.
 *
 * @internal
 */
export function measureTargetGeometry(target: TextmodeOverlayTarget): OverlayGeometry | undefined {
	assertSupportedTransformChain(target);

	const rect = target.getBoundingClientRect();
	const fallbackWidth = target instanceof HTMLCanvasElement ? target.width : target.videoWidth;
	const fallbackHeight = target instanceof HTMLCanvasElement ? target.height : target.videoHeight;
	const width = rect.width > 0 ? rect.width : fallbackWidth;
	const height = rect.height > 0 ? rect.height : fallbackHeight;
	if (width <= 0 || height <= 0) return undefined;

	return {
		left: rounded(rect.left),
		top: rounded(rect.top),
		width: rounded(width),
		height: rounded(height),
	};
}

/**
 * Measure the output canvas's local coordinate space.
 *
 * The output carries no transform of its own, so the ratio between its rendered
 * box and its used CSS size is precisely the accumulated ancestor scale (from
 * transforms and CSS `zoom`). Returns `undefined` while the output is not
 * measurable, so synchronization can safely retry later.
 *
 * @internal
 */
export function measureOutputCoordinateSpace(output: HTMLCanvasElement): OverlayCoordinateSpace | undefined {
	const rect = output.getBoundingClientRect();
	const style = getComputedStyle(output);
	assertSupportedOutputBox(style);
	const cssWidth = Number.parseFloat(style.width);
	const cssHeight = Number.parseFloat(style.height);
	if (!(rect.width > 0) || !(rect.height > 0) || !(cssWidth > 0) || !(cssHeight > 0)) return undefined;

	const scaleX = rect.width / cssWidth;
	const scaleY = rect.height / cssHeight;
	if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) return undefined;

	const cssLeft = Number.parseFloat(style.left);
	const cssTop = Number.parseFloat(style.top);
	if (!Number.isFinite(cssLeft) || !Number.isFinite(cssTop)) return undefined;
	return {
		scaleX,
		scaleY,
		originLeft: rect.left - scaleX * cssLeft,
		originTop: rect.top - scaleY * cssTop,
	};
}

/**
 * Express a target's viewport geometry as output-canvas-local CSS pixels.
 *
 * @internal
 */
export function projectGeometry(target: OverlayGeometry, space: OverlayCoordinateSpace): OverlayGeometry {
	return {
		left: rounded((target.left - space.originLeft) / space.scaleX),
		top: rounded((target.top - space.originTop) / space.scaleY),
		width: Math.round(target.width / space.scaleX),
		height: Math.round(target.height / space.scaleY),
	};
}

/**
 * Compare complete geometry values.
 *
 * @internal
 */
export function sameGeometry(a: OverlayGeometry | undefined, b: OverlayGeometry): boolean {
	return !!a && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function rounded(value: number): number {
	return Math.round(value * 100) / 100;
}

function assertSupportedTransformChain(target: HTMLElement): void {
	let element: Element | null = target;
	while (element) {
		const style = getComputedStyle(element);
		assertAxisAlignedTransform(style.transform);
		assertSupportedIndividualTransforms(style);
		assertPositiveZoom(style);
		if (style.perspective && style.perspective !== 'none') throw new Error(UNSUPPORTED_TRANSFORM_MESSAGE);
		element = composedParentElement(element);
	}
}

function composedParentElement(element: Element): Element | null {
	if (element.parentElement) return element.parentElement;
	const root = element.getRootNode();
	return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root.host : null;
}

function assertSupportedIndividualTransforms(style: CSSStyleDeclaration): void {
	if (
		!isIdentityRotation(style.rotate) ||
		!isPositiveScale(style.scale) ||
		!isTwoDimensionalTranslation(style.translate)
	) {
		throw new Error(UNSUPPORTED_TRANSFORM_MESSAGE);
	}
}

function assertPositiveZoom(style: CSSStyleDeclaration): void {
	const zoom = style.zoom;
	if (!zoom || zoom === 'normal') return;
	const value = zoom.endsWith('%') ? Number.parseFloat(zoom) / 100 : Number.parseFloat(zoom);
	if (!Number.isFinite(value) || value <= AXIS_ALIGNMENT_TOLERANCE) {
		throw new Error(UNSUPPORTED_TRANSFORM_MESSAGE);
	}
}

function isIdentityRotation(rotate: string): boolean {
	if (!rotate || rotate === 'none') return true;
	const match = /^(-?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/.exec(rotate.trim());
	if (!match) return false;
	const value = Number(match[1]);
	const unit = match[2] ?? 'deg';
	const degrees =
		unit === 'turn'
			? value * 360
			: unit === 'rad'
				? (value * 180) / Math.PI
				: unit === 'grad'
					? value * 0.9
					: value;
	return Math.abs(degrees % 360) <= AXIS_ALIGNMENT_TOLERANCE;
}

function isPositiveScale(scale: string): boolean {
	if (!scale || scale === 'none') return true;
	const values = scale
		.trim()
		.split(/\s+/)
		.map((value) => (value.endsWith('%') ? Number.parseFloat(value) / 100 : Number(value)));
	if (values.length < 1 || values.length > 2 || values.some((value) => !Number.isFinite(value))) return false;
	const scaleX = values[0];
	const scaleY = values[1] ?? scaleX;
	return scaleX > AXIS_ALIGNMENT_TOLERANCE && scaleY > AXIS_ALIGNMENT_TOLERANCE;
}

function isTwoDimensionalTranslation(translate: string): boolean {
	if (!translate || translate === 'none') return true;
	return translate.trim().split(/\s+/).length <= 2;
}

function assertSupportedOutputBox(style: CSSStyleDeclaration): void {
	const hasOwnTransform =
		(style.transform && style.transform !== 'none') ||
		(style.rotate && style.rotate !== 'none') ||
		(style.scale && style.scale !== 'none') ||
		(style.translate && style.translate !== 'none');
	const borders = [
		[style.borderTopStyle, style.borderTopWidth],
		[style.borderRightStyle, style.borderRightWidth],
		[style.borderBottomStyle, style.borderBottomWidth],
		[style.borderLeftStyle, style.borderLeftWidth],
	] as const;
	const padding = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
	const hasBorder = borders.some(
		([borderStyle, borderWidth]) =>
			borderStyle !== 'none' && (Number.parseFloat(borderWidth) || 0) > AXIS_ALIGNMENT_TOLERANCE
	);
	const hasPadding = padding.some((value) => (Number.parseFloat(value) || 0) > AXIS_ALIGNMENT_TOLERANCE);
	if (hasOwnTransform || hasBorder || hasPadding) {
		throw new Error(UNSUPPORTED_OUTPUT_BOX_MESSAGE);
	}
}
