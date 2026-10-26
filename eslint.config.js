const plugin = require('@antfu/eslint-config');
const unusedImports = require('eslint-plugin-unused-imports');

const htmlParser = require('@html-eslint/parser');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const componentImportsUnused = require('./shared/eslint/rules/component-imports-unused');
const noSignalMisuse = require('./shared/eslint/rules/no-signal-misuse');
const noOutputToInput = require('./shared/eslint/rules/no-output-to-input');
const htmlFormat = require('./shared/eslint/rules/html-format');
const sqlFormat = require('./shared/eslint/rules/sql-format');
const sqlIndent = require('./shared/eslint/rules/sql-indent');
const sqlRules = require('./shared/eslint/rules/sql-rules');
const sqlInTs = require('./shared/eslint/rules/sql-in-ts');
const sqlParser = require('./shared/eslint/plugins/sql-parser');

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
			semi: 'error',
			'style/semi': 'error',
			'max-len': ['error', 120],
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
			local: {
				rules: {
					'component-imports-unused': componentImportsUnused,
					'no-signal-misuse': noSignalMisuse,
					'no-output-to-input': noOutputToInput,
					'sql-in-ts': sqlInTs,
				},
			},
		},

		rules: {
			'local/sql-in-ts': [
				'error',
				{
					noSelectStar: true,
					requireWhereInDml: true,
					uppercaseKeywords: true,
					identifierCase: 'snake_case',
					trailingWhitespace: true,
					tags: ['sql'],
					strings: false,
				},
			],
			'local/component-imports-unused': [
				'error',
				{
					decorators: ['Component', 'Directive', 'Pipe', 'NgModule'],
					checkUnusedInArrays: ['imports'],
					templateUsage: true,
					codeUsage: true,
					cleanEmptyArrays: true,
					emptyArrays: ['imports', 'providers', 'schemas', 'exports', 'declarations', 'bootstrap'],
					pipeNames: {
						DecimalPipe: ['number'],
						DatePipe: ['date'],
						UpperCasePipe: ['uppercase'],
						LowerCasePipe: ['lowercase'],
						CurrencyPipe: ['currency'],
						PercentPipe: ['percent'],
						SlicePipe: ['slice'],
						JsonPipe: ['json'],
						AsyncPipe: ['async'],
						KeyValuePipe: ['keyvalue'],
					},
					conservativePipes: true,
					sortArrays: ['imports'],
					importGroups: true,
				},
			],
			'local/no-signal-misuse': ['error', { flagPipeOnObservables: true }],
			'local/no-output-to-input': 'error',
			'prefer-arrow-callback': 0,
			'array-bracket-spacing': 1,
			indent: ['error', 'tab', { ignoredNodes: ['PropertyDefinition'], SwitchCase: 1 }],
			semi: 'error',
			'style/semi': 'error',
			'max-len': ['error', 120],
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
			local: {
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
			'local/html-format': [
				'error',
				{
					indent: 2,
					attributeIndent: 2,
					multilineAttributes: 'auto',
					maxAttributeLineLength: 100,
					collapseBlankLines: true,
					trimTrailingWhitespace: true,
					mergeFlagAttributes: false,
					sortAttributes: true,
				},
			],
			'@html-eslint/no-duplicate-attrs': 'error',
			'@html-eslint/no-duplicate-id': 'error',
			'@html-eslint/require-img-alt': 'warn',
			'@html-eslint/no-obsolete-tags': 'error',
			'@html-eslint/no-obsolete-attrs': 'error',
			'local/no-output-to-input': 'error',
			indent: 'off',
			'max-len': 'off',
			'no-trailing-spaces': 'off',
		},
	},
	{
		files: ['**/*.sql'],
plugins: {
			local: {
				rules: {
					'sql-format': sqlFormat,
					'sql-indent': sqlIndent,
					'sql-rules': sqlRules,
				},
			},
		},
		languageOptions: {
			parser: sqlParser,
		},
		rules: {
			'local/sql-format': ['error', { useTabs: true }],
			'local/sql-indent': ['error', { useTabs: true }],
			'local/sql-rules': [
				'error',
				{
					noSelectStar: true,
					requireWhereInDml: true,
					uppercaseKeywords: true,
					identifierCase: 'snake_case',
					trailingWhitespace: true,
				},
			],
			'no-undef': 'off',
			'max-len': 'off',
			'style/no-multi-spaces': 'off',
			'style/no-multiple-empty-lines': 'off',
			'style/space-infix-ops': 'off',
			'style/no-mixed-spaces-and-tabs': 'off',
			'no-restricted-syntax': 'off',
		},
	},
	{
		files: ['src/app/components/pages/wheel-page/wheel-page.html'],
		rules: {
			'local/html-format': 'off',
		},
	},

);
