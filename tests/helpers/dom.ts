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

/**
 * Simulate an element rendered at a uniform or non-uniform ancestor scale.
 *
 * The element's local box is read from its inline styles, so the rendered
 * rectangle tracks any `left`/`top`/`width`/`height` the code under test
 * applies, exactly as an untransformed element inside a scaled ancestor would.
 */
export function mockRenderedRect(element: HTMLElement, scaleX = 1, scaleY = 1): void {
	vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
		const left = Number.parseFloat(element.style.left) || 0;
		const top = Number.parseFloat(element.style.top) || 0;
		const width = Number.parseFloat(element.style.width) || 0;
		const height = Number.parseFloat(element.style.height) || 0;
		return rect(left * scaleX, top * scaleY, width * scaleX, height * scaleY);
	});
}
