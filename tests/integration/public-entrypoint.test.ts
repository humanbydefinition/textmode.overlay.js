import { describe, expect, it } from 'vitest';
import type { Textmodifier } from 'textmode.js';
import { OverlayPlugin, type TextmodeOverlayController } from '../../src/index';
import packageMetadata from '../../package.json';

describe('public entrypoint', () => {
	it('exports the plugin and installs its browser global', () => {
		expect(OverlayPlugin.name).toBe(packageMetadata.name);
		expect(window.OverlayPlugin).toBe(OverlayPlugin);
	});

	it('augments Textmodifier with the typed controller', () => {
		const compileContract = (textmodifier: Textmodifier): TextmodeOverlayController => textmodifier.overlay;
		expect(compileContract).toBeTypeOf('function');
	});
});
