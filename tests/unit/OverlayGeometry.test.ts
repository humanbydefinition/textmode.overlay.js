import { describe, expect, it, vi } from 'vitest';
import type { TextmodeOverlayTarget } from '../../src/types';
import {
	assertAxisAlignedTransform,
	measureOutputCoordinateSpace,
	measureTargetGeometry,
	projectGeometry,
	assertValidTarget,
} from '../../src/runtime/OverlayGeometry';
import { mockRenderedRect, rect } from '../helpers/dom';

function project(target: TextmodeOverlayTarget, output: HTMLCanvasElement) {
	const targetGeometry = measureTargetGeometry(target);
	const space = measureOutputCoordinateSpace(output);
	if (!targetGeometry || !space) return undefined;
	return projectGeometry(targetGeometry, space);
}

function createOutput(width: number, height: number, scaleX = 1, scaleY = 1): HTMLCanvasElement {
	const output = document.createElement('canvas');
	output.style.width = `${width}px`;
	output.style.height = `${height}px`;
	output.style.left = '0px';
	output.style.top = '0px';
	mockRenderedRect(output, scaleX, scaleY);
	return output;
}

describe('OverlayGeometry', () => {
	describe('assertAxisAlignedTransform', () => {
		it.each([
			'none',
			'matrix(1, 0, 0, 1, 12, 24)',
			'matrix(2, 0, 0, 3, 12, 24)',
			'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 12, 24, 0, 1)',
		])('accepts %s', (transform) => {
			expect(() => assertAxisAlignedTransform(transform)).not.toThrow();
		});

		it.each([
			'rotate(20deg)',
			'matrix(0.7071, 0.7071, -0.7071, 0.7071, 0, 0)',
			'matrix(1, 0.1, 0, 1, 0, 0)',
			'matrix(-1, 0, 0, -1, 0, 0)',
			'matrix(-1, 0, 0, 1, 0, 0)',
			'matrix(0, 0, 0, 1, 0, 0)',
			'matrix3d(1, 0.1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
			'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
			'matrix3d(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
		])('rejects %s', (transform) => {
			expect(() => assertAxisAlignedTransform(transform)).toThrow(
				'Only finite, positive, axis-aligned transforms'
			);
		});
	});

	describe('measureOutputCoordinateSpace', () => {
		it('derives the ancestor scale and origin from the rendered box', () => {
			const output = createOutput(100, 50, 2, 3);

			expect(measureOutputCoordinateSpace(output)).toEqual({
				scaleX: 2,
				scaleY: 3,
				originLeft: 0,
				originTop: 0,
			});
		});

		it('returns undefined while the output is not measurable', () => {
			const output = document.createElement('canvas');
			output.style.width = '100px';
			output.style.height = '50px';
			vi.spyOn(output, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 0, 0));

			expect(measureOutputCoordinateSpace(output)).toBeUndefined();
		});

		it('derives the origin from resolved stylesheet offsets', () => {
			const style = document.createElement('style');
			style.textContent = '.resolved-offset { left: 20px; top: 10px; width: 100px; height: 50px; }';
			document.head.append(style);
			const output = document.createElement('canvas');
			output.className = 'resolved-offset';
			vi.spyOn(output, 'getBoundingClientRect').mockReturnValue(rect(40, 30, 200, 100));

			expect(measureOutputCoordinateSpace(output)).toEqual({
				scaleX: 2,
				scaleY: 2,
				originLeft: 0,
				originTop: 10,
			});
			style.remove();
		});

		it.each([
			['transform', 'scale(2)'],
			['border', '1px solid black'],
			['padding', '1px'],
		] as const)('rejects an output canvas with its own %s', (property, value) => {
			const output = createOutput(100, 50);
			output.style[property] = value;

			expect(() => measureOutputCoordinateSpace(output)).toThrow(
				'output canvas cannot have its own transform, border, or padding'
			);
		});
	});

	it('uses intrinsic canvas dimensions when the layout rectangle has no size and rounds geometry', () => {
		const target = document.createElement('canvas');
		const output = createOutput(10, 10);
		target.width = 640;
		target.height = 360;
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(12.345, 23.456, 0, 0));

		expect(project(target, output)).toEqual({ left: 12.35, top: 23.46, width: 640, height: 360 });
	});

	it('projects a target into an ancestor-scaled output space', () => {
		const target = document.createElement('canvas');
		const output = createOutput(200, 100, 2, 2);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 400, 200));

		expect(project(target, output)).toEqual({ left: 50, top: 25, width: 200, height: 100 });
	});

	it('supports non-uniform ancestor scales per axis', () => {
		const target = document.createElement('canvas');
		const output = createOutput(100, 100, 2, 4);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(200, 400, 400, 800));

		expect(project(target, output)).toEqual({ left: 100, top: 100, width: 200, height: 200 });
	});

	it('validates target kind and rejects using the output canvas as its own target', () => {
		const output = document.createElement('canvas');
		expect(() => assertValidTarget({}, output)).toThrow(
			'setTarget() requires an HTMLCanvasElement or HTMLVideoElement'
		);
		expect(() => assertValidTarget(output, output)).toThrow('cannot be used as its own overlay target');
	});

	it.each([
		['transform', 'rotate(20deg)'],
		['perspective', '500px'],
	] as const)('rejects an unsupported ancestor %s', (property, value) => {
		const parent = document.createElement('div');
		const target = document.createElement('canvas');
		parent.style[property] = value;
		parent.append(target);
		document.body.append(parent);

		expect(() => measureTargetGeometry(target)).toThrow('Only finite, positive, axis-aligned transforms');
	});

	it('validates transformed ancestors across a shadow-root boundary', () => {
		const host = document.createElement('div');
		host.style.transform = 'rotate(20deg)';
		const target = document.createElement('canvas');
		host.attachShadow({ mode: 'open' }).append(target);
		document.body.append(host);

		expect(() => measureTargetGeometry(target)).toThrow('Only finite, positive, axis-aligned transforms');
	});

	it.each([
		['rotate', '180deg'],
		['scale', '-1 1'],
		['scale', '1 1 1'],
		['translate', '1px 2px 3px'],
	] as const)('rejects an individual target %s transform', (property, value) => {
		const target = document.createElement('canvas');
		target.style[property] = value;
		document.body.append(target);

		expect(() => measureTargetGeometry(target)).toThrow('Only finite, positive, axis-aligned transforms');
	});
});
