import type { TextmodePluginContext, TextmodeTexture, Textmodifier } from 'textmode.js';
import type { TextmodeOverlayController, TextmodeOverlayTarget } from './types';

type CanvasStyleSnapshot = Pick<
	CSSStyleDeclaration,
	'position' | 'left' | 'top' | 'width' | 'height' | 'zIndex' | 'display' | 'pointerEvents'
>;

type GeometrySnapshot = {
	left: number;
	top: number;
	width: number;
	height: number;
};

const ERROR_PREFIX = '[textmode.overlay.js]';

function rounded(value: number): number {
	return Math.round(value * 100) / 100;
}

function snapshotStyle(canvas: HTMLCanvasElement): CanvasStyleSnapshot {
	return {
		position: canvas.style.position,
		left: canvas.style.left,
		top: canvas.style.top,
		width: canvas.style.width,
		height: canvas.style.height,
		zIndex: canvas.style.zIndex,
		display: canvas.style.display,
		pointerEvents: canvas.style.pointerEvents,
	};
}

function sameGeometry(a: GeometrySnapshot | undefined, b: GeometrySnapshot): boolean {
	return !!a && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/** @internal */
export class TextmodeOverlayControllerImpl implements TextmodeOverlayController {
	private readonly _textmodifier: Textmodifier;
	private readonly _output: HTMLCanvasElement;
	private readonly _originalParent: Node | null;
	private readonly _originalNextSibling: Node | null;
	private readonly _originalStyle: CanvasStyleSnapshot;
	private readonly _unregisterPostDraw: () => void;

	private _target: TextmodeOverlayTarget | undefined;
	private _source: TextmodeTexture | undefined;
	private _visible = true;
	private _disposed = false;
	private _resizeObserver: ResizeObserver | undefined;
	private _mountObserver: MutationObserver | undefined;
	private _isObserving = false;
	private _animationFrame: number | undefined;
	private _lastGeometry: GeometrySnapshot | undefined;

	private readonly _scheduleFromEvent = (): void => this._scheduleSynchronization();

	constructor(textmodifier: Textmodifier, context: TextmodePluginContext) {
		this._textmodifier = textmodifier;
		this._output = textmodifier.canvas;
		this._originalParent = this._output.parentNode;
		this._originalNextSibling = this._output.nextSibling;
		this._originalStyle = snapshotStyle(this._output);
		this._unregisterPostDraw = context.on('postDraw', this._scheduleFromEvent);
	}

	public get target(): TextmodeOverlayTarget | undefined {
		this._assertActive();
		return this._target;
	}

	public get source(): TextmodeTexture | undefined {
		this._assertActive();
		return this._source;
	}

	public setTarget(target: TextmodeOverlayTarget): TextmodeTexture {
		this._assertActive();
		this._validateTarget(target);

		if (target === this._target && this._source) {
			this._scheduleSynchronization();
			return this._source;
		}

		this._releaseBinding(false);
		this._target = target;
		this._source = this._textmodifier.createTexture(target);
		if (this._insertWhenPossible()) this._observeTarget();
		this._scheduleSynchronization();
		return this._source;
	}

	public clearTarget(): void {
		this._assertActive();
		this._releaseBinding(true);
	}

	public show(): void {
		this._assertActive();
		this._visible = true;
		this._output.style.display = this._originalStyle.display;
		this._insertWhenPossible();
		this._scheduleSynchronization();
	}

	public hide(): void {
		this._assertActive();
		if (!this._visible) return;
		this._visible = false;
		this._output.style.display = 'none';
	}

	public toggle(): void {
		this._assertActive();
		if (this._visible) this.hide();
		else this.show();
	}

	public isVisible(): boolean {
		this._assertActive();
		return this._visible;
	}

	/** Release all plugin-owned resources. */
	public dispose(): void {
		if (this._disposed) return;
		this._releaseBinding(true);
		this._unregisterPostDraw();
		this._disposed = true;
	}

	private _assertActive(): void {
		if (this._disposed) {
			throw new Error(`${ERROR_PREFIX} This overlay controller has been disposed.`);
		}
	}

	private _validateTarget(target: TextmodeOverlayTarget): void {
		const isCanvas = typeof HTMLCanvasElement !== 'undefined' && target instanceof HTMLCanvasElement;
		const isVideo = typeof HTMLVideoElement !== 'undefined' && target instanceof HTMLVideoElement;
		if (!isCanvas && !isVideo) {
			throw new TypeError(`${ERROR_PREFIX} setTarget() requires an HTMLCanvasElement or HTMLVideoElement.`);
		}
		if (target === this._output) {
			throw new TypeError(`${ERROR_PREFIX} The textmode output canvas cannot be used as its own overlay target.`);
		}
		this._assertAxisAligned(getComputedStyle(target).transform);
	}

	private _observeTarget(): void {
		const target = this._target;
		if (!target || this._isObserving) return;
		this._isObserving = true;

		if (typeof ResizeObserver !== 'undefined') {
			this._resizeObserver = new ResizeObserver(this._scheduleFromEvent);
			this._resizeObserver.observe(target, { box: 'border-box' });
		}

		window.addEventListener('resize', this._scheduleFromEvent);
		window.addEventListener('scroll', this._scheduleFromEvent, true);
		if (target instanceof HTMLVideoElement) {
			target.addEventListener('loadedmetadata', this._scheduleFromEvent);
			target.addEventListener('resize', this._scheduleFromEvent);
		}
	}

	private _insertWhenPossible(): boolean {
		const target = this._target;
		if (!target) return false;
		if (!target.isConnected || !target.parentNode) {
			this._watchForMount();
			return false;
		}

		this._mountObserver?.disconnect();
		this._mountObserver = undefined;
		if (this._output.previousSibling !== target || this._output.parentNode !== target.parentNode) {
			target.parentNode.insertBefore(this._output, target.nextSibling);
		}

		const targetZIndex = Number.parseFloat(getComputedStyle(target).zIndex);
		this._output.style.position = 'absolute';
		this._output.style.zIndex = String((Number.isFinite(targetZIndex) ? targetZIndex : 0) + 1);
		this._output.style.pointerEvents = 'auto';
		this._output.style.display = this._visible ? this._originalStyle.display : 'none';
		return true;
	}

	private _watchForMount(): void {
		if (this._mountObserver || typeof MutationObserver === 'undefined') return;
		const root = document.documentElement;
		if (!root) return;
		this._mountObserver = new MutationObserver(() => {
			if (!this._target?.isConnected) return;
			if (this._insertWhenPossible()) this._observeTarget();
			this._scheduleSynchronization();
		});
		this._mountObserver.observe(root, { childList: true, subtree: true });
	}

	private _scheduleSynchronization(): void {
		if (this._disposed || !this._target || this._animationFrame !== undefined) return;
		if (!this._target.isConnected) {
			this._watchForMount();
			return;
		}
		this._animationFrame = window.requestAnimationFrame(() => {
			this._animationFrame = undefined;
			this._synchronize();
		});
	}

	private _synchronize(): void {
		const target = this._target;
		if (!target) return;
		if (!this._insertWhenPossible()) return;

		const computed = getComputedStyle(target);
		this._assertAxisAligned(computed.transform);
		const rect = target.getBoundingClientRect();
		const fallbackWidth = target instanceof HTMLCanvasElement ? target.width : target.videoWidth;
		const fallbackHeight = target instanceof HTMLCanvasElement ? target.height : target.videoHeight;
		const width = rounded(rect.width > 0 ? rect.width : fallbackWidth);
		const height = rounded(rect.height > 0 ? rect.height : fallbackHeight);
		if (width <= 0 || height <= 0) return;

		const { left, top } = this._coordinatesForOffsetParent(rect);
		const geometry = { left: rounded(left), top: rounded(top), width, height };
		if (sameGeometry(this._lastGeometry, geometry)) return;

		const sizeChanged =
			!this._lastGeometry ||
			this._lastGeometry.width !== geometry.width ||
			this._lastGeometry.height !== geometry.height;
		this._lastGeometry = geometry;
		this._output.style.left = `${geometry.left}px`;
		this._output.style.top = `${geometry.top}px`;
		if (sizeChanged) this._textmodifier.resizeCanvas(geometry.width, geometry.height);
	}

	private _coordinatesForOffsetParent(rect: DOMRect): { left: number; top: number } {
		const offsetParent = this._output.offsetParent;
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

	private _assertAxisAligned(transform: string): void {
		if (!transform || transform === 'none') return;
		const matrix = /^matrix\(([^)]+)\)$/.exec(transform);
		if (matrix) {
			const values = matrix[1].split(',').map(Number);
			if (values.length === 6 && Math.abs(values[1]) <= 1e-8 && Math.abs(values[2]) <= 1e-8) return;
		}
		const matrix3d = /^matrix3d\(([^)]+)\)$/.exec(transform);
		if (matrix3d) {
			const values = matrix3d[1].split(',').map(Number);
			const offAxis = [1, 2, 3, 4, 6, 7, 8, 9, 11];
			if (values.length === 16 && offAxis.every((index) => Math.abs(values[index]) <= 1e-8)) return;
		}
		if (!matrix && !matrix3d) {
			throw new Error(`${ERROR_PREFIX} Rotated and skewed overlay targets are not supported.`);
		}
		throw new Error(`${ERROR_PREFIX} Rotated and skewed overlay targets are not supported.`);
	}

	private _releaseBinding(restoreCanvas: boolean): void {
		if (this._animationFrame !== undefined) {
			window.cancelAnimationFrame(this._animationFrame);
			this._animationFrame = undefined;
		}
		this._resizeObserver?.disconnect();
		this._resizeObserver = undefined;
		this._isObserving = false;
		this._mountObserver?.disconnect();
		this._mountObserver = undefined;
		window.removeEventListener('resize', this._scheduleFromEvent);
		window.removeEventListener('scroll', this._scheduleFromEvent, true);
		if (this._target instanceof HTMLVideoElement) {
			this._target.removeEventListener('loadedmetadata', this._scheduleFromEvent);
			this._target.removeEventListener('resize', this._scheduleFromEvent);
		}
		this._source?.dispose();
		this._source = undefined;
		this._target = undefined;
		this._lastGeometry = undefined;
		if (restoreCanvas) this._restoreCanvas();
	}

	private _restoreCanvas(): void {
		if (this._output.isConnected && this._originalParent) {
			const sibling = this._originalNextSibling;
			this._originalParent.insertBefore(
				this._output,
				sibling?.parentNode === this._originalParent ? sibling : null
			);
		}
		Object.assign(this._output.style, this._originalStyle);
	}
}
