import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlaySynchronizer } from '../../src/runtime/OverlaySynchronizer';
import {
	flushAnimationFrame,
	getRafCallbacks,
	installAnimationFrameMock,
	installResizeObserver,
	mockRenderedRect,
	rect,
	ResizeObserverDouble,
} from '../helpers';

beforeEach(() => {
	installResizeObserver();
	installAnimationFrameMock();
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
		output.style.width = '10px';
		output.style.height = '10px';
		mockRenderedRect(output);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 320, 180));
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);

		synchronizer.bind(target, true, 'none');

		expect(target.nextSibling).toBe(output);
		expect(output.style.position).toBe('absolute');
		expect(output.style.pointerEvents).toBe('none');
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

		synchronizer.bind(target, true, 'none');
		synchronizer.request();
		synchronizer.request();
		expect(getRafCallbacks()).toHaveLength(1);

		synchronizer.clear({ restoreCanvas: true });

		expect(ResizeObserverDouble.instances[0].disconnect).toHaveBeenCalledOnce();
		expect(output.parentNode).toBe(document.body);
		expect(target.nextSibling).toBe(output);
		synchronizer.dispose();
	});

	it('normalizes offsets even when the output already follows the target', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		const resizeCanvas = vi.fn();
		output.style.cssText = 'left:25%;top:auto;width:40px;height:30px';
		mockRenderedRect(output);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 100, 50));
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);

		synchronizer.bind(target, true, 'none');

		expect(output.style.left).toBe('0px');
		expect(output.style.top).toBe('0px');
		flushAnimationFrame();
		expect(output.style.left).toBe('10px');
		expect(output.style.top).toBe('20px');
		synchronizer.dispose();
	});

	it('normalizes stylesheet-provided offsets before measuring an already-adjacent output', () => {
		const style = document.createElement('style');
		style.textContent = '.stylesheet-offset { left: 25%; top: auto; }';
		document.head.append(style);
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		output.className = 'stylesheet-offset';
		output.style.width = '40px';
		output.style.height = '30px';
		mockRenderedRect(output);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 100, 50));
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, vi.fn());

		synchronizer.bind(target, true, 'none');

		expect(output.style.left).toBe('0px');
		expect(output.style.top).toBe('0px');
		flushAnimationFrame();
		expect(output.style.left).toBe('10px');
		expect(output.style.top).toBe('20px');
		synchronizer.dispose();
		style.remove();
	});

	it('reprojects when the output space changes but the target viewport rectangle does not', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		let outputScale = 1;
		output.style.width = '100px';
		output.style.height = '50px';
		vi.spyOn(output, 'getBoundingClientRect').mockImplementation(() => {
			const left = Number.parseFloat(output.style.left) || 0;
			const top = Number.parseFloat(output.style.top) || 0;
			const width = Number.parseFloat(output.style.width) || 0;
			const height = Number.parseFloat(output.style.height) || 0;
			return rect(left * outputScale, top * outputScale, width * outputScale, height * outputScale);
		});
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 50));
		const resizeCanvas = vi.fn((width: number, height: number) => {
			output.style.width = `${width}px`;
			output.style.height = `${height}px`;
		});
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);
		synchronizer.bind(target, true, 'none');
		flushAnimationFrame();

		outputScale = 2;
		synchronizer.request();
		flushAnimationFrame();

		expect(resizeCanvas).toHaveBeenLastCalledWith(50, 25);
		expect(resizeCanvas).toHaveBeenCalledTimes(2);
		synchronizer.dispose();
	});

	it('does not poison cached geometry while the output is unmeasurable', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		let targetRect = rect(0, 0, 100, 50);
		output.style.width = '100px';
		output.style.height = '50px';
		vi.spyOn(output, 'getBoundingClientRect').mockImplementation(() => {
			if (output.style.display === 'none') return rect(0, 0, 0, 0);
			return rect(
				Number.parseFloat(output.style.left) || 0,
				Number.parseFloat(output.style.top) || 0,
				Number.parseFloat(output.style.width) || 0,
				Number.parseFloat(output.style.height) || 0
			);
		});
		vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => targetRect);
		const resizeCanvas = vi.fn((width: number, height: number) => {
			output.style.width = `${width}px`;
			output.style.height = `${height}px`;
		});
		document.body.append(target, output);
		const synchronizer = new OverlaySynchronizer(output, resizeCanvas);
		synchronizer.bind(target, true, 'none');
		flushAnimationFrame();

		synchronizer.setVisible(false);
		targetRect = rect(20, 30, 200, 100);
		synchronizer.synchronizeImmediately();
		synchronizer.setVisible(true);
		flushAnimationFrame();

		expect(output.style.left).toBe('20px');
		expect(output.style.top).toBe('30px');
		expect(resizeCanvas).toHaveBeenLastCalledWith(200, 100);
		synchronizer.dispose();
	});

	it('invalidates geometry when an already-bound output is reinserted', () => {
		const originalParent = document.createElement('div');
		const foreignParent = document.createElement('div');
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		output.style.width = '100px';
		output.style.height = '50px';
		mockRenderedRect(output);
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 100, 50));
		originalParent.append(target, output);
		document.body.append(originalParent, foreignParent);
		const synchronizer = new OverlaySynchronizer(output, vi.fn());
		synchronizer.bind(target, true, 'none');
		flushAnimationFrame();

		foreignParent.append(output);
		output.style.left = '777px';
		synchronizer.request();
		flushAnimationFrame();

		expect(output.parentNode).toBe(originalParent);
		expect(output.style.left).toBe('10px');
		expect(output.style.top).toBe('20px');
		synchronizer.dispose();
	});
});
