import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlaySynchronizer } from '../../src/runtime/OverlaySynchronizer';

class ResizeObserverDouble {
	public static instances: ResizeObserverDouble[] = [];
	public readonly disconnect = vi.fn();
	public readonly observe = vi.fn();

	constructor(_callback: ResizeObserverCallback) {
		ResizeObserverDouble.instances.push(this);
	}
}

let rafCallbacks: FrameRequestCallback[];

function flushAnimationFrame(): void {
	const callbacks = rafCallbacks.splice(0);
	for (const callback of callbacks) callback(performance.now());
}

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

beforeEach(() => {
	rafCallbacks = [];
	ResizeObserverDouble.instances = [];
	vi.stubGlobal('ResizeObserver', ResizeObserverDouble);
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		rafCallbacks.push(callback);
		return rafCallbacks.length;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

describe('OverlaySynchronizer', () => {
	it('places connected targets synchronously and measures them on the next frame', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		const resizeCanvas = vi.fn();
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 320, 180));
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);

		synchronizer.bind(target, true);

		expect(target.nextSibling).toBe(output);
		expect(output.style.position).toBe('absolute');
		expect(resizeCanvas).not.toHaveBeenCalled();
		flushAnimationFrame();

		expect(output.style.left).toBe('10px');
		expect(output.style.top).toBe('20px');
		expect(resizeCanvas).toHaveBeenCalledWith(320, 180);
		synchronizer.dispose();
	});

	it('coalesces requests and disconnects target resources on clear', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('video');
		const resizeCanvas = vi.fn();
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);

		synchronizer.bind(target, true);
		synchronizer.request();
		synchronizer.request();
		expect(rafCallbacks).toHaveLength(1);

		synchronizer.clear({ restoreCanvas: true });

		expect(ResizeObserverDouble.instances[0].disconnect).toHaveBeenCalledOnce();
		expect(output.parentNode).toBe(document.body);
		expect(target.nextSibling).toBe(output);
		synchronizer.dispose();
	});
});
