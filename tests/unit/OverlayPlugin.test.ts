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

		const cleanup = OverlayPlugin.install(textmodifier, context) as unknown as (() => void) | undefined;

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
		const cleanup = OverlayPlugin.install(textmodifier, context) as unknown as (() => void) | undefined;

		cleanup?.();

		expect(unregister).toHaveBeenCalledOnce();
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

		const cleanup = OverlayPlugin.install(textmodifier, context) as unknown as (() => void) | undefined;
		const controller = (context.defineExtension as ReturnType<typeof vi.fn>).mock.calls[0][2].get();
		controller.setTarget(target);
		frame?.(performance.now());
		requestAnimationFrame.mockClear();

		postDraw?.();
		postDraw?.();

		expect(requestAnimationFrame).toHaveBeenCalledOnce();
		cleanup?.();
	});
});
