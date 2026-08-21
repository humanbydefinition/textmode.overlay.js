import type { TextmodeTexture, Textmodifier } from 'textmode.js';
import { assertValidTarget } from './OverlayGeometry';
import { OverlaySynchronizer } from './OverlaySynchronizer';
import type { TextmodeOverlayController, TextmodeOverlayTarget } from '../types';

const ERROR_PREFIX = '[textmode.overlay.js]';

/** @internal */
export class TextmodeOverlayControllerImpl implements TextmodeOverlayController {
	private readonly _textmodifier: Textmodifier;
	private readonly _output: HTMLCanvasElement;
	private readonly _synchronizer: OverlaySynchronizer;

	private _target: TextmodeOverlayTarget | undefined;
	private _source: TextmodeTexture | undefined;
	private _visible = true;
	private _disposed = false;

	constructor(textmodifier: Textmodifier) {
		this._textmodifier = textmodifier;
		this._output = textmodifier.canvas;
		this._synchronizer = new OverlaySynchronizer(this._output, (width, height) =>
			this._textmodifier.resizeCanvas(width, height)
		);
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
		assertValidTarget(target, this._output);

		if (target === this._target && this._source) {
			this.requestSynchronization();
			return this._source;
		}

		this._releaseBinding(false);
		this._target = target;
		this._source = this._textmodifier.createTexture(target);
		this._synchronizer.bind(target, this._visible);
		return this._source;
	}

	public clearTarget(): void {
		this._assertActive();
		this._releaseBinding(true);
	}

	public show(): void {
		this._assertActive();
		this._visible = true;
		this._synchronizer.setVisible(true);
	}

	public hide(): void {
		this._assertActive();
		if (!this._visible) return;
		this._visible = false;
		this._synchronizer.setVisible(false);
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

	/**
	 * Request synchronization from the host plugin adapter.
	 *
	 * @internal
	 */
	public requestSynchronization(): void {
		this._assertActive();
		this._synchronizer.request();
	}

	/**
	 * Synchronize target geometry immediately at a host lifecycle boundary.
	 *
	 * @internal
	 */
	public synchronizeImmediately(options: { forceResize?: boolean } = {}): void {
		this._assertActive();
		this._synchronizer.synchronizeImmediately(options);
	}

	/** Release all plugin-owned resources. */
	public dispose(): void {
		if (this._disposed) return;
		this._releaseBinding(true);
		this._synchronizer.dispose();
		this._disposed = true;
	}

	private _assertActive(): void {
		if (this._disposed) {
			throw new Error(`${ERROR_PREFIX} This overlay controller has been disposed.`);
		}
	}

	private _releaseBinding(restoreCanvas: boolean): void {
		this._synchronizer.clear({ restoreCanvas });
		this._source?.dispose();
		this._source = undefined;
		this._target = undefined;
	}
}
