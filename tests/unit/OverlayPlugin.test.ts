import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextmodeExtensionDescriptor, TextmodePluginContext, Textmodifier } from 'textmode.js';
import { OverlayPlugin } from '../../src/OverlayPlugin';
import type { TextmodeOverlayControllerImpl } from '../../src/runtime/TextmodeOverlayController';
import packageMetadata from '../../package.json';
import { flushAnimationFrame, installAnimationFrameMock, installResizeObserver, rect, setRect } from '../helpers';

interface PluginHarness {
	output: HTMLCanvasElement;
	textmodifier: Textmodifier;
	context: TextmodePluginContext;
	hooks: Map<string, () => void>;
	unregisterMocks: ReturnType<typeof vi.fn>[];
	texture: { dispose: ReturnType<typeof vi.fn> };
	resizeCanvas: ReturnType<typeof vi.fn>;
	createTexture: ReturnType<typeof vi.fn>;
	getController: () => TextmodeOverlayControllerImpl;
	install: () => () => void;
}

function createPluginHarness(): PluginHarness {
	const output = document.createElement('canvas');
	const texture = { dispose: vi.fn() };
	const createTexture = vi.fn(() => texture);
	const resizeCanvas = vi.fn();
	const textmodifier = { canvas: output, createTexture, resizeCanvas } as unknown as Textmodifier;

	const hooks = new Map<string, () => void>();
	const unregisterMocks: ReturnType<typeof vi.fn>[] = [];
	let descriptor: TextmodeExtensionDescriptor<Textmodifier> | undefined;

	const context = {
		on: vi.fn((hook: string, callback: () => void) => {
			hooks.set(hook, callback);
			const unregister = vi.fn();
			unregisterMocks.push(unregister);
			return unregister;
		}),
		defineExtension: vi.fn((_target, _name, value) => {
			descriptor = value as TextmodeExtensionDescriptor<Textmodifier>;
			return vi.fn();
		}),
	} as unknown as TextmodePluginContext;

	return {
		output,
		textmodifier,
		context,
		hooks,
		unregisterMocks,
		texture,
		resizeCanvas,
		createTexture,
		getController: () => descriptor?.get?.call(textmodifier) as TextmodeOverlayControllerImpl,
		install: () => OverlayPlugin.install(textmodifier, context) as () => void,
	};
}

beforeEach(() => {
	installResizeObserver();
	installAnimationFrameMock();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

describe('OverlayPlugin', () => {
	it('exports stable plugin metadata and defines an instance overlay accessor', () => {
		const harness = createPluginHarness();
		const cleanup = harness.install();

		expect(OverlayPlugin.name).toBe(packageMetadata.name);
		expect(harness.context.defineExtension).toHaveBeenCalledWith('textmodifier', 'overlay', expect.any(Object));
		expect(harness.getController()).toBeDefined();

		cleanup();
	});

	it('cleans up a live controller through the returned cleanup', () => {
		const harness = createPluginHarness();
		const cleanup = harness.install();
		const controller = harness.getController();

		cleanup();

		expect(harness.unregisterMocks).toHaveLength(2);
		expect(harness.unregisterMocks[0]).toHaveBeenCalledOnce();
		expect(harness.unregisterMocks[1]).toHaveBeenCalledOnce();
		expect(() => controller.isVisible()).toThrow('controller has been disposed');
	});

	it('translates postDraw into a coalesced controller synchronization request', () => {
		const harness = createPluginHarness();
		const target = document.createElement('canvas');
		document.body.append(target);

		const cleanup = harness.install();
		const controller = harness.getController();
		controller.setTarget(target);
		flushAnimationFrame();

		const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
		rafSpy.mockClear();

		harness.hooks.get('postDraw')?.();
		harness.hooks.get('postDraw')?.();

		expect(rafSpy).toHaveBeenCalledOnce();
		cleanup();
	});

	it('reapplies cached target dimensions when core becomes ready', () => {
		const harness = createPluginHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(0, 0, 320, 180));
		document.body.append(target);

		const cleanup = harness.install();
		const controller = harness.getController();
		controller.setTarget(target);
		flushAnimationFrame();

		expect(harness.resizeCanvas).toHaveBeenCalledTimes(1);
		harness.hooks.get('preSetup')?.();

		expect(harness.resizeCanvas).toHaveBeenCalledTimes(2);
		expect(harness.resizeCanvas).toHaveBeenLastCalledWith(320, 180);
		cleanup();
	});

	it('cancels a pending geometry frame during the core-ready synchronization', () => {
		const harness = createPluginHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(0, 0, 160, 90));
		document.body.append(target);

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
		const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

		const cleanup = harness.install();
		const controller = harness.getController();
		controller.setTarget(target);
		harness.hooks.get('preSetup')?.();

		expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
		expect(harness.resizeCanvas).toHaveBeenCalledOnce();
		expect(harness.resizeCanvas).toHaveBeenCalledWith(160, 90);
		cleanup();
	});

	it('does not add a core-ready resize when the target is bound after preSetup', () => {
		const harness = createPluginHarness();
		const target = document.createElement('canvas');
		setRect(target, rect(0, 0, 240, 135));
		document.body.append(target);

		const cleanup = harness.install();
		harness.hooks.get('preSetup')?.();
		const controller = harness.getController();
		controller.setTarget(target);
		flushAnimationFrame();

		expect(harness.resizeCanvas).toHaveBeenCalledOnce();
		expect(harness.resizeCanvas).toHaveBeenCalledWith(240, 135);
		cleanup();
	});
});
