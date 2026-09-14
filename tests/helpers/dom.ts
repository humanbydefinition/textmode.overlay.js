import { vi } from 'vitest';

export function rect(left: number, top: number, width: number, height: number): DOMRect {
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

export function setRect(element: Element, value: DOMRect): void {
	vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(value);
}
