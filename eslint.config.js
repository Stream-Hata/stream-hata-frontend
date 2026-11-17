const plugin = require('@antfu/eslint-config');
const unusedImports = require('eslint-plugin-unused-imports');

const htmlParser = require('@html-eslint/parser');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const componentImportsUnused = require('@stream-hata/eslint-rules/rules/component-imports-unused');
const noSignalMisuse = require('@stream-hata/eslint-rules/rules/no-signal-misuse');
const noOutputToInput = require('@stream-hata/eslint-rules/rules/no-output-to-input');
const htmlFormat = require('@stream-hata/eslint-rules/rules/html-format');

module.exports = plugin.antfu(
	{
		stylistic: {
			semi: true,
			indent: 'tab',
			quotes: 'single',
		},
		html: false,
		yaml: false,
		markdown: false,
		ignores: [
			'**/jest.config.ts',
			'tools/legacy/**',
			'*.json',
			'tsconfig.*.json',
			'node_modules',
			'tslint.json',
			'**/*.js',
			'src/test.ts',
			'*.js',
			'*.md',
			'**/server.js',
			'**/app.js',
			'README.md',
			'changelog.md',
			'.opencode/**',
		],
		typescript: true,
		jsonc: false,
		overrides: {
			typescript: true,
			yaml: false,
			markdown: false,
			plugins: {
				angular: {
					rules: {
						'@angular-eslint/directive-selector': [
							'error',
							{ type: 'attribute', prefix: 'app', style: 'camelCase' },
						],
						'@angular-eslint/component-selector': [
							'error',
							{ type: 'element', prefix: 'app', style: 'kebab-case' },
						],
					},
				},
				unusedImports: {
					rules: [unusedImports],
				},
			},
		},
		rules: {
			'no-var': 'off',
			'style/eol-last': 'off',
			'style/arrow-parens': 'off',
			'antfu/if-newline': 'off',
			'style/binary-ops': 'off',
			'style/indent-operator-linebreak': 'off',
			'style/operator-linebreak': [
				'off',
				'before',
				{ overrides: { '||': 'after', '&&': 'after' } },
			],
			'prefer-arrow-callback': 0,
			'array-bracket-spacing': 1,
			indent: ['error', 'tab', { ignoredNodes: ['PropertyDefinition'], SwitchCase: 1 }],
			'style/indent': 'off',
			semi: 'error',
			'style/semi': 'error',
			'max-len': [
				'error',
				{
					code: 120,
					ignoreUrls: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreRegExpLiterals: true,
					ignoreComments: true,
				},
			],
			'style/jsx-quotes': 'error',
			'antfu/consistent-list-newline': 'error',
			'no-trailing-spaces': 'error',
			'no-console': 'error',
			'no-alert': 'error',
			'node/no-path-concat': 'off',
			quotes: ['error', 'single'],
			'dot-notation': 'off',
			'style/brace-style': 'off',
			'no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'node/prefer-global/process': 'off',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		ignores: [
			'**/.svg',
			'**/**/*.test.{js,ts}',
			'.vscode',
			'.vscode/**',
			'**/jest.config.ts',
			'*.json',
			'tsconfig.*.json',
			'node_modules',
			'./tslint.json',
			'./src/assets/**/*.js',
			'*.js',
			'*.md',
			'**/app.js',
			'**/server.js',
			'README.md',
			'changelog.md',
			'.opencode/**',
		],
	},
	{
		files: ['**/*.ts', '**/*.mts', '**/*.cts', '**/*.tsx'],
		plugins: {
			angular: {
				rules: {
					'@angular-eslint/directive-selector': [
						'error',
						{ type: 'attribute', prefix: 'app', style: 'camelCase' },
					],
					'@angular-eslint/component-selector': [
						'error',
						{ type: 'element', prefix: 'app', style: 'kebab-case' },
					],
				},
			},
			...unusedImports,
			'stream-hata': {
				rules: {
					'component-imports-unused': componentImportsUnused,
					'no-signal-misuse': noSignalMisuse,
					'no-output-to-input': noOutputToInput,
				},
			},
		},

		rules: {

			'stream-hata/component-imports-unused': 'off',
			'stream-hata/no-signal-misuse': ['error', { flagPipeOnObservables: true }],
			'stream-hata/no-output-to-input': 'error',
			'prefer-arrow-callback': 0,
			'array-bracket-spacing': 1,
			indent: ['error', 'tab', { ignoredNodes: ['PropertyDefinition'], SwitchCase: 1 }],
			'style/indent': 'off',
			semi: 'error',
			'style/semi': 'error',
			'max-len': [
				'error',
				{
					code: 120,
					ignoreUrls: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreRegExpLiterals: true,
					ignoreComments: true,
				},
			],
			'style/jsx-quotes': 'error',
			'antfu/consistent-list-newline': 'error',
			'no-trailing-spaces': 'error',
			'no-console': 'error',
			'no-alert': 'error',
			quotes: ['error', 'single'],
			'no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'node/prefer-global/process': 'off',
			'node/no-path-concat': 'off',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		files: ['**/*.html'],
		plugins: {
			'@html-eslint': htmlPlugin,
			'stream-hata': {
				rules: {
					'html-format': htmlFormat,
					'no-output-to-input': noOutputToInput,
				},
			},
		},
		languageOptions: {
			parser: htmlParser,
		},
		rules: {
			'stream-hata/html-format': [
				'error',
				{
					indent: 2,
					attributeIndent: 2,
					multilineAttributes: 'never',
					maxAttributeLineLength: 100,
					collapseBlankLines: true,
					trimTrailingWhitespace: true,
					mergeFlagAttributes: false,
					sortAttributes: false,
				},
			],
			'@html-eslint/no-duplicate-attrs': 'error',
			'@html-eslint/no-duplicate-id': 'error',
			'@html-eslint/require-img-alt': 'warn',
			'@html-eslint/no-obsolete-tags': 'error',
			'@html-eslint/no-obsolete-attrs': 'error',
			'stream-hata/no-output-to-input': 'error',
			indent: 'off',
			'max-len': 'off',
			'no-trailing-spaces': 'off',
		},
	},
	{
		files: ['apps/web/src/app/components/overlays/dice-overlay/dice-scene.ts'],
		rules: {
			'ts/ban-ts-comment': 'off',
		},
	},
	{
		files: ['apps/web/src/app/components/pages/wheel-page/wheel-page.html'],
		rules: {
			'stream-hata/html-format': 'off',
		},
	},

);
