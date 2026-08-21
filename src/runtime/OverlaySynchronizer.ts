import type { TextmodeOverlayTarget } from '../types';
import { measureOverlayGeometry, sameGeometry } from './OverlayGeometry';
import type { OverlayGeometry } from './OverlayGeometry';

type CanvasStyleSnapshot = Pick<
	CSSStyleDeclaration,
	'position' | 'left' | 'top' | 'width' | 'height' | 'zIndex' | 'display' | 'pointerEvents'
>;

/** @internal */
export class OverlaySynchronizer {
	private readonly _output: HTMLCanvasElement;
	private readonly _resizeCanvas: (width: number, height: number) => void;
	private readonly _originalParent: Node | null;
	private readonly _originalNextSibling: Node | null;
	private readonly _originalStyle: CanvasStyleSnapshot;

	private _target: TextmodeOverlayTarget | undefined;
	private _visible = true;
	private _resizeObserver: ResizeObserver | undefined;
	private _mountObserver: MutationObserver | undefined;
	private _isObserving = false;
	private _animationFrame: number | undefined;
	private _lastGeometry: OverlayGeometry | undefined;

	private readonly _scheduleFromEvent = (): void => this.request();

	constructor(output: HTMLCanvasElement, resizeCanvas: (width: number, height: number) => void) {
		this._output = output;
		this._resizeCanvas = resizeCanvas;
		this._originalParent = output.parentNode;
		this._originalNextSibling = output.nextSibling;
		this._originalStyle = snapshotStyle(output);
	}

	public bind(target: TextmodeOverlayTarget, visible: boolean): void {
		this._target = target;
		this._visible = visible;
		if (this._insertWhenPossible()) this._observeTarget();
		this.request();
	}

	public request(): void {
		if (!this._target || this._animationFrame !== undefined) return;
		if (!this._target.isConnected) {
			this._watchForMount();
			return;
		}
		this._animationFrame = window.requestAnimationFrame(() => {
			this._animationFrame = undefined;
			this._synchronize();
		});
	}

	public synchronizeImmediately(options: { forceResize?: boolean } = {}): void {
		this._cancelAnimationFrame();
		this._synchronize(options.forceResize ?? false);
	}

	public setVisible(visible: boolean): void {
		this._visible = visible;
		if (!visible) {
			this._setStyle('display', 'none');
			return;
		}
		this._setStyle('display', this._originalStyle.display);
		this._insertWhenPossible();
		this.request();
	}

	public clear(options: { restoreCanvas: boolean }): void {
		this._cancelAnimationFrame();
		this._disconnectObserversAndListeners();
		this._target = undefined;
		this._lastGeometry = undefined;
		if (options.restoreCanvas) this._restoreCanvas();
	}

	public dispose(): void {
		this.clear({ restoreCanvas: true });
	}

	private _synchronize(forceResize: boolean = false): void {
		const target = this._target;
		if (!target || !this._insertWhenPossible()) return;

		const geometry = measureOverlayGeometry(target, this._output);
		if (!geometry || (!forceResize && sameGeometry(this._lastGeometry, geometry))) return;

		const previousGeometry = this._lastGeometry;
		const sizeChanged =
			forceResize ||
			!previousGeometry ||
			previousGeometry.width !== geometry.width ||
			previousGeometry.height !== geometry.height;
		this._lastGeometry = geometry;
		this._setStyle('left', `${geometry.left}px`);
		this._setStyle('top', `${geometry.top}px`);
		if (sizeChanged) this._resizeCanvas(geometry.width, geometry.height);
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
		this._setStyle('position', 'absolute');
		this._setStyle('zIndex', String((Number.isFinite(targetZIndex) ? targetZIndex : 0) + 1));
		this._setStyle('pointerEvents', 'auto');
		this._setStyle('display', this._visible ? this._originalStyle.display : 'none');
		return true;
	}

	private _watchForMount(): void {
		if (this._mountObserver || typeof MutationObserver === 'undefined') return;
		const root = document.documentElement;
		if (!root) return;
		this._mountObserver = new MutationObserver(() => {
			if (!this._target?.isConnected) return;
			if (this._insertWhenPossible()) this._observeTarget();
			this.request();
		});
		this._mountObserver.observe(root, { childList: true, subtree: true });
	}

	private _disconnectObserversAndListeners(): void {
		this._resizeObserver?.disconnect();
		this._resizeObserver = undefined;
		this._mountObserver?.disconnect();
		this._mountObserver = undefined;
		const target = this._target;
		this._isObserving = false;

		window.removeEventListener('resize', this._scheduleFromEvent);
		window.removeEventListener('scroll', this._scheduleFromEvent, true);
		if (target instanceof HTMLVideoElement) {
			target.removeEventListener('loadedmetadata', this._scheduleFromEvent);
			target.removeEventListener('resize', this._scheduleFromEvent);
		}
	}

	private _cancelAnimationFrame(): void {
		if (this._animationFrame === undefined) return;
		window.cancelAnimationFrame(this._animationFrame);
		this._animationFrame = undefined;
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

	private _setStyle(property: keyof CanvasStyleSnapshot, value: string): void {
		if (this._output.style[property] !== value) this._output.style[property] = value;
	}
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
