import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextmodePluginContext, TextmodeTexture, Textmodifier } from 'textmode.js';
import { TextmodeOverlayControllerImpl } from '../../src/TextmodeOverlayController';

class ResizeObserverDouble {
	public static instances: ResizeObserverDouble[] = [];
	public readonly observe = vi.fn();
	public readonly disconnect = vi.fn();
	public readonly callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		ResizeObserverDouble.instances.push(this);
	}
}

type Harness = {
	controller: TextmodeOverlayControllerImpl;
	output: HTMLCanvasElement;
	textmodifier: Textmodifier;
	texture: TextmodeTexture & { dispose: ReturnType<typeof vi.fn>; characters: ReturnType<typeof vi.fn> };
	createTexture: ReturnType<typeof vi.fn>;
	resizeCanvas: ReturnType<typeof vi.fn>;
	postDraw: () => void;
	unregister: ReturnType<typeof vi.fn>;
};

let rafCallbacks: FrameRequestCallback[];
let activeControllers: TextmodeOverlayControllerImpl[];

function rect(left: number, top: number, width: number, height: number): DOMRect {
	return {
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	};
}

function setRect(element: Element, value: DOMRect): void {
	vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(value);
}

function flushAnimationFrame(): void {
	const pending = rafCallbacks.splice(0);
	for (const callback of pending) callback(performance.now());
}

function createHarness(): Harness {
	const output = document.createElement('canvas');
	output.style.cssText = 'position:relative;left:2px;top:3px;width:40px;height:30px;z-index:7;pointer-events:none';
	document.body.append(output);

	const texture = {
		dispose: vi.fn(),
		characters: vi.fn(),
	} as unknown as Harness['texture'];
	const createTexture = vi.fn(() => texture);
	const resizeCanvas = vi.fn();
	const textmodifier = { canvas: output, createTexture, resizeCanvas } as unknown as Textmodifier;
	let postDraw = (): void => undefined;
	const unregister = vi.fn();
	const context = {
		on(_hook: 'postDraw', callback: () => void) {
			postDraw = callback;
			return unregister;
		},
	} as unknown as TextmodePluginContext;
	const controller = new TextmodeOverlayControllerImpl(textmodifier, context);
	activeControllers.push(controller);
	return {
		controller,
		output,
		textmodifier,
		texture,
		createTexture,
		resizeCanvas,
		postDraw: () => postDraw(),
		unregister,
	};
}

beforeEach(() => {
	rafCallbacks = [];
	activeControllers = [];
	ResizeObserverDouble.instances = [];
	vi.stubGlobal('ResizeObserver', ResizeObserverDouble);
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		rafCallbacks.push(callback);
		return rafCallbacks.length;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
	for (const controller of activeControllers) controller.dispose();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

describe('TextmodeOverlayController', () => {
	it('binds a canvas synchronously and inserts the output immediately after it', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		target.style.zIndex = '4';
		setRect(target, rect(10, 20, 320, 180));
		document.body.prepend(target);

		const source = harness.controller.setTarget(target);

		expect(source).toBe(harness.texture);
		expect(harness.controller.target).toBe(target);
		expect(harness.controller.source).toBe(harness.texture);
		expect(harness.createTexture).toHaveBeenCalledWith(target);
		expect(target.nextSibling).toBe(harness.output);
		expect(harness.output.style.position).toBe('absolute');
		expect(harness.output.style.zIndex).toBe('5');
		expect(harness.output.style.pointerEvents).toBe('auto');

		flushAnimationFrame();
		expect(harness.resizeCanvas).toHaveBeenCalledWith(320, 180);
		expect(harness.output.style.left).toBe('10px');
		expect(harness.output.style.top).toBe('20px');
	});

	it('supports video targets and metadata-driven synchronization', () => {
		const harness = createHarness();
		const video = document.createElement('video');
		Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 360 } });
		setRect(video, rect(0, 0, 0, 0));
		document.body.prepend(video);

		expect(harness.controller.setTarget(video)).toBe(harness.texture);
		flushAnimationFrame();
		expect(harness.resizeCanvas).toHaveBeenLastCalledWith(640, 360);

		video.dispatchEvent(new Event('loadedmetadata'));
		expect(rafCallbacks).toHaveLength(1);
	});

	it('uses target backing dimensions when layout geometry is zero', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		target.width = 500;
		target.height = 250;
		setRect(target, rect(0, 0, 0, 0));
		document.body.prepend(target);

		harness.controller.setTarget(target);
		flushAnimationFrame();

		expect(harness.resizeCanvas).toHaveBeenCalledWith(500, 250);
	});

	it('calculates coordinates relative to the actual nested offset parent', () => {
		const harness = createHarness();
		const parent = document.createElement('div');
		const target = document.createElement('canvas');
		document.body.prepend(parent);
		parent.append(target);
		setRect(parent, rect(20, 10, 800, 600));
		setRect(target, rect(120, 80, 200, 100));
		Object.defineProperties(parent, {
			scrollLeft: { value: 5 },
			scrollTop: { value: 9 },
			clientLeft: { value: 2 },
			clientTop: { value: 3 },
		});
		Object.defineProperty(harness.output, 'offsetParent', { value: parent });

		harness.controller.setTarget(target);
		flushAnimationFrame();

		expect(harness.output.style.left).toBe('103px');
		expect(harness.output.style.top).toBe('76px');
	});

	it('coalesces resize, scroll, observer, and post-draw notifications', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(1, 2, 100, 50));
		document.body.prepend(target);
		harness.controller.setTarget(target);

		window.dispatchEvent(new Event('resize'));
		window.dispatchEvent(new Event('scroll'));
		ResizeObserverDouble.instances[0].callback([], ResizeObserverDouble.instances[0] as unknown as ResizeObserver);
		harness.postDraw();

		expect(rafCallbacks).toHaveLength(1);
	});

	it('does not resize again when geometry is unchanged', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(1, 2, 100, 50));
		document.body.prepend(target);
		harness.controller.setTarget(target);
		flushAnimationFrame();

		harness.postDraw();
		flushAnimationFrame();

		expect(harness.resizeCanvas).toHaveBeenCalledTimes(1);
	});

	it('repositions after captured scrolling without resizing unchanged framebuffers', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		let targetRect = rect(30, 40, 100, 50);
		vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => targetRect);
		document.body.prepend(target);
		harness.controller.setTarget(target);
		flushAnimationFrame();

		targetRect = rect(10, 15, 100, 50);
		window.dispatchEvent(new Event('scroll'));
		flushAnimationFrame();

		expect(harness.output.style.left).toBe('10px');
		expect(harness.output.style.top).toBe('15px');
		expect(harness.resizeCanvas).toHaveBeenCalledTimes(1);
	});

	it('returns the existing source when the same target is rebound', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		document.body.prepend(target);
		const first = harness.controller.setTarget(target);
		const second = harness.controller.setTarget(target);

		expect(second).toBe(first);
		expect(harness.createTexture).toHaveBeenCalledTimes(1);
		expect(rafCallbacks).toHaveLength(1);
	});

	it('disposes the old source before retargeting', () => {
		const harness = createHarness();
		const firstTarget = document.createElement('canvas');
		const secondTarget = document.createElement('video');
		document.body.prepend(firstTarget, secondTarget);
		harness.controller.setTarget(firstTarget);

		harness.controller.setTarget(secondTarget);

		expect(harness.texture.dispose).toHaveBeenCalledTimes(1);
		expect(harness.createTexture).toHaveBeenLastCalledWith(secondTarget);
	});

	it('waits for a disconnected target to be mounted', async () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(0, 0, 80, 40));
		harness.controller.setTarget(target);

		expect(harness.output.previousSibling).not.toBe(target);
		document.body.prepend(target);
		await Promise.resolve();

		expect(target.nextSibling).toBe(harness.output);
		flushAnimationFrame();
		expect(harness.resizeCanvas).toHaveBeenCalledWith(80, 40);
	});

	it('hides only the output and forces a synchronization request when shown', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		document.body.prepend(target);
		harness.controller.setTarget(target);
		flushAnimationFrame();

		harness.controller.hide();
		expect(harness.controller.isVisible()).toBe(false);
		expect(harness.output.style.display).toBe('none');
		expect(harness.controller.source).toBe(harness.texture);
		harness.controller.toggle();
		expect(harness.controller.isVisible()).toBe(true);
		expect(harness.output.style.display).toBe('');
		expect(rafCallbacks).toHaveLength(1);
	});

	it('clears idempotently and restores DOM placement and modified inline styles', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		document.body.prepend(target);
		harness.controller.setTarget(target);

		harness.controller.clearTarget();
		harness.controller.clearTarget();

		expect(harness.controller.target).toBeUndefined();
		expect(harness.controller.source).toBeUndefined();
		expect(harness.texture.dispose).toHaveBeenCalledTimes(1);
		expect(harness.output.style.position).toBe('relative');
		expect(harness.output.style.pointerEvents).toBe('none');
		expect(harness.output.style.left).toBe('2px');
		expect(window.cancelAnimationFrame).toHaveBeenCalled();
		expect(ResizeObserverDouble.instances[0].disconnect).toHaveBeenCalledOnce();
	});

	it('does not reattach a core-removed output canvas during disposal', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		document.body.prepend(target);
		harness.controller.setTarget(target);
		harness.output.remove();

		harness.controller.dispose();

		expect(harness.output.isConnected).toBe(false);
	});

	it('rejects invalid, self, rotated, and skewed targets descriptively', () => {
		const harness = createHarness();
		expect(() => harness.controller.setTarget({} as HTMLCanvasElement)).toThrow(
			'setTarget() requires an HTMLCanvasElement or HTMLVideoElement'
		);
		expect(() => harness.controller.setTarget(harness.output)).toThrow('cannot be used as its own overlay target');

		const rotated = document.createElement('canvas');
		rotated.style.transform = 'rotate(20deg)';
		document.body.append(rotated);
		expect(() => harness.controller.setTarget(rotated)).toThrow(
			'Rotated and skewed overlay targets are not supported'
		);
	});

	it('isolates multiple controllers', () => {
		const first = createHarness();
		const second = createHarness();
		const firstTarget = document.createElement('canvas');
		const secondTarget = document.createElement('video');
		document.body.prepend(firstTarget, secondTarget);

		first.controller.setTarget(firstTarget);
		second.controller.setTarget(secondTarget);

		expect(first.controller.target).toBe(firstTarget);
		expect(second.controller.target).toBe(secondTarget);
		expect(first.controller.source).not.toBe(second.controller.source);
	});

	it('disposes idempotently and makes retained controllers unusable', () => {
		const harness = createHarness();
		const target = document.createElement('canvas');
		document.body.prepend(target);
		harness.controller.setTarget(target);

		harness.controller.dispose();
		harness.controller.dispose();

		expect(harness.texture.dispose).toHaveBeenCalledTimes(1);
		expect(harness.unregister).toHaveBeenCalledTimes(1);
		expect(() => harness.controller.isVisible()).toThrow('controller has been disposed');
		expect(() => harness.controller.clearTarget()).toThrow('controller has been disposed');
		expect(() => harness.controller.target).toThrow('controller has been disposed');
	});
});
