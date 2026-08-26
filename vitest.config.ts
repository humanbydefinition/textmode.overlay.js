import path from 'path';

import { defineTextmodeProject } from '@textmode/build';

export default defineTextmodeProject({
	projects: [
		{
			test: {
				name: 'unit',
				environment: 'jsdom',
				include: ['tests/unit/**/*.test.ts'],
			},
		},
		{
			test: {
				name: 'integration',
				environment: 'jsdom',
				include: ['tests/integration/**/*.test.ts'],
			},
		},
	],
	alias: {
		'textmode.overlay.js': path.resolve(import.meta.dirname, 'src/index.ts'),
	},
});
