import { vi } from 'vitest';

export class ResizeObserverDouble implements ResizeObserver {
	public static instances: ResizeObserverDouble[] = [];
	public readonly observe = vi.fn();
	public readonly unobserve = vi.fn();
	public readonly disconnect = vi.fn();
	public readonly callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		ResizeObserverDouble.instances.push(this);
	}

	public trigger(entries: ResizeObserverEntry[] = []): void {
		this.callback(entries, this);
	}
}

export function installResizeObserver(): void {
	ResizeObserverDouble.instances = [];
	vi.stubGlobal('ResizeObserver', ResizeObserverDouble);
}
