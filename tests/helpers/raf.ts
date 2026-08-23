import { vi } from 'vitest';

let rafCallbacks: FrameRequestCallback[] = [];

export function getRafCallbacks(): FrameRequestCallback[] {
	return rafCallbacks;
}

export function flushAnimationFrame(): void {
	const callbacks = rafCallbacks.splice(0);
	for (const callback of callbacks) callback(performance.now());
}

export function installAnimationFrameMock(): void {
	rafCallbacks = [];
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		rafCallbacks.push(callback);
		return rafCallbacks.length;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
}
