import type { TextmodeOverlayTarget } from '../types';

/** @internal */
export const ERROR_PREFIX = '[textmode.overlay.js]';
const AXIS_ALIGNMENT_TOLERANCE = 1e-8;

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
	assertAxisAlignedTransform(getComputedStyle(target).transform);
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
			Math.abs(values[1]) <= AXIS_ALIGNMENT_TOLERANCE &&
			Math.abs(values[2]) <= AXIS_ALIGNMENT_TOLERANCE
		) {
			return;
		}
	}

	const matrix3d = /^matrix3d\(([^)]+)\)$/.exec(transform);
	if (matrix3d) {
		const values = matrix3d[1].split(',').map(Number);
		const offAxis = [1, 2, 3, 4, 6, 7, 8, 9, 11];
		if (values.length === 16 && offAxis.every((index) => Math.abs(values[index]) <= AXIS_ALIGNMENT_TOLERANCE)) {
			return;
		}
	}

	throw new Error(`${ERROR_PREFIX} Rotated and skewed overlay targets are not supported.`);
}

/**
 * Measure and round a target in the output canvas's coordinate space.
 *
 * @internal
 */
export function measureOverlayGeometry(
	target: TextmodeOverlayTarget,
	output: HTMLCanvasElement
): OverlayGeometry | undefined {
	assertAxisAlignedTransform(getComputedStyle(target).transform);

	const rect = target.getBoundingClientRect();
	const fallbackWidth = target instanceof HTMLCanvasElement ? target.width : target.videoWidth;
	const fallbackHeight = target instanceof HTMLCanvasElement ? target.height : target.videoHeight;
	const width = rounded(rect.width > 0 ? rect.width : fallbackWidth);
	const height = rounded(rect.height > 0 ? rect.height : fallbackHeight);
	if (width <= 0 || height <= 0) return undefined;

	const coordinates = coordinatesForOffsetParent(rect, output);
	return {
		left: rounded(coordinates.left),
		top: rounded(coordinates.top),
		width,
		height,
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

function coordinatesForOffsetParent(rect: DOMRect, output: HTMLCanvasElement): { left: number; top: number } {
	const offsetParent = output.offsetParent;
	if (
		offsetParent instanceof HTMLElement &&
		offsetParent !== document.body &&
		offsetParent !== document.documentElement
	) {
		const parentRect = offsetParent.getBoundingClientRect();
		return {
			left: rect.left - parentRect.left + offsetParent.scrollLeft - offsetParent.clientLeft,
			top: rect.top - parentRect.top + offsetParent.scrollTop - offsetParent.clientTop,
		};
	}
	return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
}

function rounded(value: number): number {
	return Math.round(value * 100) / 100;
}
