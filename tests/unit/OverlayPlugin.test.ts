import { describe, expect, it, vi } from 'vitest';
import type { TextmodeExtensionDescriptor, TextmodePluginContext, Textmodifier } from 'textmode.js';
import { OverlayPlugin } from '../../src/OverlayPlugin';
import packageMetadata from '../../package.json';

describe('OverlayPlugin', () => {
	it('exports stable plugin metadata and defines an instance overlay accessor', () => {
		const output = document.createElement('canvas');
		const textmodifier = { canvas: output } as Textmodifier;
		let descriptor: TextmodeExtensionDescriptor<Textmodifier> | undefined;
		const context = {
			on: vi.fn(() => vi.fn()),
			defineExtension: vi.fn((_target, _name, value) => {
				descriptor = value as TextmodeExtensionDescriptor<Textmodifier>;
				return vi.fn();
			}),
		} as unknown as TextmodePluginContext;

		const cleanup = OverlayPlugin.install(textmodifier, context);

		expect(OverlayPlugin.name).toBe(packageMetadata.name);
		expect(context.defineExtension).toHaveBeenCalledWith('textmodifier', 'overlay', expect.any(Object));
		expect(descriptor?.get?.call(textmodifier)).toBeDefined();

		cleanup?.();
	});

	it('cleans up a live controller through the returned cleanup', () => {
		const output = document.createElement('canvas');
		const textmodifier = { canvas: output } as Textmodifier;
		const unregister = vi.fn();
		let controller: { isVisible(): boolean } | undefined;
		const context = {
			on: vi.fn(() => unregister),
			defineExtension: vi.fn((_target, _name, descriptor) => {
				controller = descriptor.get();
				return vi.fn();
			}),
		} as unknown as TextmodePluginContext;
		const cleanup = OverlayPlugin.install(textmodifier, context);

		cleanup?.();

		expect(unregister).toHaveBeenCalledTimes(2);
		expect(() => controller?.isVisible()).toThrow('controller has been disposed');
	});

	it('translates postDraw into a coalesced controller synchronization request', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		const texture = { dispose: vi.fn() };
		const textmodifier = {
			canvas: output,
			createTexture: vi.fn(() => texture),
			resizeCanvas: vi.fn(),
		} as unknown as Textmodifier;
		let postDraw: (() => void) | undefined;
		const context = {
			on: vi.fn((_hook, callback: () => void) => {
				postDraw = callback;
				return vi.fn();
			}),
			defineExtension: vi.fn((_target, _name, descriptor) => descriptor),
		} as unknown as TextmodePluginContext;
		let frame: FrameRequestCallback | undefined;
		const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			frame = callback;
			return 1;
		});
		document.body.append(target);

		const cleanup = OverlayPlugin.install(textmodifier, context);
		const controller = (context.defineExtension as ReturnType<typeof vi.fn>).mock.calls[0][2].get();
		controller.setTarget(target);
		frame?.(performance.now());
		requestAnimationFrame.mockClear();

		postDraw?.();
		postDraw?.();

		expect(requestAnimationFrame).toHaveBeenCalledOnce();
		cleanup?.();
	});

	it('reapplies cached target dimensions when core becomes ready', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			top: 0,
			right: 320,
			bottom: 180,
			x: 0,
			y: 0,
			width: 320,
			height: 180,
			toJSON: () => ({}),
		});
		const texture = { dispose: vi.fn() };
		const resizeCanvas = vi.fn();
		const textmodifier = {
			canvas: output,
			createTexture: vi.fn(() => texture),
			resizeCanvas,
		} as unknown as Textmodifier;
		const hooks = new Map<string, () => void>();
		const context = {
			on: vi.fn((hook: string, callback: () => void) => {
				hooks.set(hook, callback);
				return vi.fn();
			}),
			defineExtension: vi.fn((_target, _name, descriptor) => descriptor),
		} as unknown as TextmodePluginContext;
		let frame: FrameRequestCallback | undefined;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			frame = callback;
			return 1;
		});
		document.body.append(target);

		const cleanup = OverlayPlugin.install(textmodifier, context);
		const controller = (context.defineExtension as ReturnType<typeof vi.fn>).mock.calls[0][2].get();
		controller.setTarget(target);
		frame?.(performance.now());

		expect(resizeCanvas).toHaveBeenCalledTimes(1);
		hooks.get('preSetup')?.();

		expect(resizeCanvas).toHaveBeenCalledTimes(2);
		expect(resizeCanvas).toHaveBeenLastCalledWith(320, 180);
		cleanup?.();
	});

	it('cancels a pending geometry frame during the core-ready synchronization', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			top: 0,
			right: 160,
			bottom: 90,
			x: 0,
			y: 0,
			width: 160,
			height: 90,
			toJSON: () => ({}),
		});
		const resizeCanvas = vi.fn();
		const textmodifier = {
			canvas: output,
			createTexture: vi.fn(() => ({ dispose: vi.fn() })),
			resizeCanvas,
		} as unknown as Textmodifier;
		const hooks = new Map<string, () => void>();
		const context = {
			on: vi.fn((hook: string, callback: () => void) => {
				hooks.set(hook, callback);
				return vi.fn();
			}),
			defineExtension: vi.fn((_target, _name, descriptor) => descriptor),
		} as unknown as TextmodePluginContext;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
		const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
		document.body.append(target);

		const cleanup = OverlayPlugin.install(textmodifier, context);
		const controller = (context.defineExtension as ReturnType<typeof vi.fn>).mock.calls[0][2].get();
		controller.setTarget(target);
		hooks.get('preSetup')?.();

		expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
		expect(resizeCanvas).toHaveBeenCalledOnce();
		expect(resizeCanvas).toHaveBeenCalledWith(160, 90);
		cleanup?.();
	});

	it('does not add a core-ready resize when the target is bound after preSetup', () => {
		const output = document.createElement('canvas');
		const target = document.createElement('canvas');
		vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			top: 0,
			right: 240,
			bottom: 135,
			x: 0,
			y: 0,
			width: 240,
			height: 135,
			toJSON: () => ({}),
		});
		const resizeCanvas = vi.fn();
		const textmodifier = {
			canvas: output,
			createTexture: vi.fn(() => ({ dispose: vi.fn() })),
			resizeCanvas,
		} as unknown as Textmodifier;
		const hooks = new Map<string, () => void>();
		const context = {
			on: vi.fn((hook: string, callback: () => void) => {
				hooks.set(hook, callback);
				return vi.fn();
			}),
			defineExtension: vi.fn((_target, _name, descriptor) => descriptor),
		} as unknown as TextmodePluginContext;
		let frame: FrameRequestCallback | undefined;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			frame = callback;
			return 1;
		});
		document.body.append(target);

		const cleanup = OverlayPlugin.install(textmodifier, context);
		hooks.get('preSetup')?.();
		const controller = (context.defineExtension as ReturnType<typeof vi.fn>).mock.calls[0][2].get();
		controller.setTarget(target);
		frame?.(performance.now());

		expect(resizeCanvas).toHaveBeenCalledOnce();
		expect(resizeCanvas).toHaveBeenCalledWith(240, 135);
		cleanup?.();
	});
});
