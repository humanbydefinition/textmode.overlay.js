import { describe, expect, it, vi } from 'vitest';
import {
	assertAxisAlignedTransform,
	measureOverlayGeometry,
	assertValidTarget,
} from '../../src/runtime/OverlayGeometry';
import { rect } from '../helpers/dom';

describe('OverlayGeometry', () => {
	describe('assertAxisAlignedTransform', () => {
		it.each(['none', 'matrix(1, 0, 0, 1, 12, 24)', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 12, 24, 0, 1)'])(
			'accepts %s',
			(transform) => {
				expect(() => assertAxisAlignedTransform(transform)).not.toThrow();
			}
		);

		it.each([
			'rotate(20deg)',
			'matrix(1, 0.1, 0, 1, 0, 0)',
			'matrix3d(1, 0.1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
		])('rejects %s', (transform) => {
			expect(() => assertAxisAlignedTransform(transform)).toThrow(
				'Rotated and skewed overlay targets are not supported'
			);
		});
	});

	it('uses intrinsic canvas dimensions when the layout rectangle has no size and rounds geometry', () => {
		const target = document.createElement('canvas');
		const output = document.createElement('canvas');
		target.width = 640;
		target.height = 360;
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(12.345, 23.456, 0, 0));

		expect(measureOverlayGeometry(target, output)).toEqual({ left: 12.35, top: 23.46, width: 640, height: 360 });
	});

	it('converts target coordinates into a nested offset parent space', () => {
		const parent = document.createElement('div');
		const target = document.createElement('canvas');
		const output = document.createElement('canvas');
		vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(rect(20, 10, 800, 600));
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(120, 80, 200, 100));
		Object.defineProperties(parent, {
			scrollLeft: { value: 5 },
			scrollTop: { value: 9 },
			clientLeft: { value: 2 },
			clientTop: { value: 3 },
		});
		Object.defineProperty(output, 'offsetParent', { value: parent });

		expect(measureOverlayGeometry(target, output)).toMatchObject({ left: 103, top: 76, width: 200, height: 100 });
	});

	it('validates target kind and rejects using the output canvas as its own target', () => {
		const output = document.createElement('canvas');
		expect(() => assertValidTarget({}, output)).toThrow(
			'setTarget() requires an HTMLCanvasElement or HTMLVideoElement'
		);
		expect(() => assertValidTarget(output, output)).toThrow('cannot be used as its own overlay target');
	});
});
