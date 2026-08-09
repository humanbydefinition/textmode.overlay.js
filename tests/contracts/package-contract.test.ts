import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageContract = {
	name: string;
	version: string;
	main: string;
	module: string;
	types: string;
	dependencies?: Record<string, string>;
	peerDependencies: Record<string, string>;
};

function sourceText(directory: string): string {
	return readdirSync(directory, { withFileTypes: true })
		.map((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory()
				? sourceText(path)
				: entry.name.endsWith('.ts')
					? readFileSync(path, 'utf8')
					: '';
		})
		.join('\n');
}

describe('package contract', () => {
	const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageContract;

	it('publishes ESM, UMD, declarations, and the supported host peer range', () => {
		expect(packageJson.name).toBe('textmode.overlay.js');
		expect(packageJson.version).toBe('1.0.0');
		expect(packageJson.module).toBe('./dist/textmode.overlay.esm.js');
		expect(packageJson.main).toBe('./dist/textmode.overlay.umd.js');
		expect(packageJson.types).toBe('./dist/types/index.d.ts');
		expect(packageJson.peerDependencies['textmode.js']).toBe('>=0.18.0 <0.19.0');
	});

	it('has no runtime dependencies or core-internal imports', () => {
		expect(packageJson.dependencies).toBeUndefined();
		const source = sourceText(join(process.cwd(), 'src'));
		expect(source).not.toMatch(/textmode\.js\/src|src\/textmode|\/internal\//);
		expect(source).toContain("from 'textmode.js'");
	});
});
