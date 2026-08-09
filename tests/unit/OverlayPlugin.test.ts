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
			registerPostDrawHook: vi.fn(() => vi.fn()),
			defineExtension: vi.fn((_target, _name, value) => {
				descriptor = value as TextmodeExtensionDescriptor<Textmodifier>;
				return vi.fn();
			}),
		} as unknown as TextmodePluginContext;

		OverlayPlugin.install(textmodifier, context);

		expect(OverlayPlugin.name).toBe('textmode.overlay');
		expect(OverlayPlugin.version).toBe(packageMetadata.version);
		expect(context.defineExtension).toHaveBeenCalledWith('textmodifier', 'overlay', expect.any(Object));
		expect(descriptor?.get?.call(textmodifier)).toBeDefined();
	});

	it('cleans up a live controller on uninstall', () => {
		const output = document.createElement('canvas');
		const textmodifier = { canvas: output } as Textmodifier;
		const unregister = vi.fn();
		let controller: { isVisible(): boolean } | undefined;
		const context = {
			registerPostDrawHook: vi.fn(() => unregister),
			defineExtension: vi.fn((_target, _name, descriptor) => {
				controller = descriptor.get();
				return vi.fn();
			}),
		} as unknown as TextmodePluginContext;
		OverlayPlugin.install(textmodifier, context);

		OverlayPlugin.uninstall?.(textmodifier, context);

		expect(unregister).toHaveBeenCalledOnce();
		expect(() => controller?.isVisible()).toThrow('controller has been disposed');
	});
});
