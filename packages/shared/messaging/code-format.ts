import { detectCodeLanguage } from './message-content';

type PrettierParser =
	| 'angular'
	| 'babel'
	| 'css'
	| 'graphql'
	| 'html'
	| 'json'
	| 'json5'
	| 'jsonc'
	| 'less'
	| 'lwc'
	| 'markdown'
	| 'mdx'
	| 'mjml'
	| 'scss'
	| 'typescript'
	| 'vue'
	| 'yaml';

const PARSERS: Record<string, PrettierParser> = {
	angular: 'angular',
	babel: 'babel',
	css: 'css',
	gql: 'graphql',
	graphql: 'graphql',
	html: 'html',
	javascript: 'babel',
	js: 'babel',
	json: 'json',
	json5: 'json5',
	jsonc: 'jsonc',
	jsx: 'babel',
	less: 'less',
	lwc: 'lwc',
	md: 'markdown',
	mdx: 'mdx',
	markdown: 'markdown',
	mjml: 'mjml',
	scss: 'scss',
	ts: 'typescript',
	tsx: 'typescript',
	typescript: 'typescript',
	vue: 'vue',
	yaml: 'yaml',
	yml: 'yaml',
};

const SQL_DIALECTS: Record<string, string> = {
	bigquery: 'bigquery',
	db2: 'db2',
	hive: 'hive',
	mariadb: 'mariadb',
	mssql: 'tsql',
	mysql: 'mysql',
	n1ql: 'n1ql',
	oracle: 'plsql',
	plsql: 'plsql',
	postgres: 'postgresql',
	postgresql: 'postgresql',
	psql: 'postgresql',
	redshift: 'redshift',
	snowflake: 'snowflake',
	spark: 'spark',
	sql: 'sql',
	sqlite: 'sqlite',
	tidb: 'tidb',
	trino: 'trino',
	tsql: 'tsql',
};

const PRESERVE_INDENT = new Set([
	'clojure',
	'crystal',
	'diff',
	'dockerfile',
	'elixir',
	'elm',
	'erlang',
	'fsharp',
	'fs',
	'haskell',
	'hs',
	'ini',
	'julia',
	'latex',
	'lisp',
	'lua',
	'makefile',
	'nim',
	'ocaml',
	'perl',
	'python',
	'py',
	'r',
	'ruby',
	'rb',
	'scheme',
	'shell',
	'sh',
	'bash',
	'zsh',
	'fish',
	'powershell',
	'ps1',
	'toml',
]);

const BRACE_LANGUAGES = new Set([
	'c',
	'c++',
	'cpp',
	'csharp',
	'cs',
	'dart',
	'groovy',
	'java',
	'kotlin',
	'kt',
	'objective-c',
	'objc',
	'php',
	'protobuf',
	'proto',
	'rust',
	'rs',
	'scala',
	'solidity',
	'swift',
	'vala',
	'zig',
]);

export interface CodeIssue {
	line: number;
	column: number;
	message: string;
}

export async function formatCode(code: string, language: string): Promise<string> {
	const lang = language.trim().toLowerCase();
	const issue = validateCode(code, lang);

	if (issue) {
		throw new SyntaxError(`${issue.message} (${issue.line}:${issue.column})`);
	}

	if (SQL_DIALECTS[lang]) {
		const { format } = await import('sql-formatter');

		return format(code, {
			language: SQL_DIALECTS[lang] as never,
			tabWidth: 2,
			keywordCase: 'upper',
		});
	}
	const parser = PARSERS[lang];

	if (parser) {
		return formatWithPrettier(code, parser);
	}
	if (PRESERVE_INDENT.has(lang)) {
		return formatPreservingIndent(code);
	}
	if (BRACE_LANGUAGES.has(lang)) {
		return formatIndented(code);
	}

	return code;
}

export async function validateCodeBlock(code: string, language: string): Promise<CodeIssue | null> {
	const lang = language.trim().toLowerCase();
	const generic = validateCode(code, lang);

	if (generic) {
		return generic;
	}

	if (!PARSERS[lang] && !SQL_DIALECTS[lang]) {
		return null;
	}

	try {
		await formatCode(code, lang);

		return null;
	} catch (error) {
		return describeCodeError(error);
	}
}

export async function formatFencedCode(text: string, strict = false): Promise<string> {
	const fences = text.match(/```/g)?.length ?? 0;

	if (strict && fences % 2 !== 0) {
		throw new SyntaxError('Незакрытый блок кода: добавьте закрывающие ```');
	}

	const fence = /```([^\n`]*)\n([\s\S]*?)```/g;
	let result = '';
	let cursor = 0;

	for (const match of text.matchAll(fence)) {
		const index = match.index ?? 0;
		const rawLanguage = (match[1] ?? '').trim();
		const code = match[2]?.replace(/\n$/, '') ?? '';
		const language = rawLanguage || detectCodeLanguage(code) || '';
		let formatted: string;

		try {
			formatted = (await formatCode(code, language)).trimEnd();
		} catch (error) {
			if (strict) {
				throw error;
			}
			formatted = code;
		}
		result += text.slice(cursor, index);
		result += `\`\`\`${language}\n${formatted}\n\`\`\``;
		cursor = index + match[0].length;
	}

	return cursor ? result + text.slice(cursor) : text;
}

export function describeCodeError(error: unknown): CodeIssue {
	const value = error as {
		loc?: { start?: { line?: number; column?: number } };
		message?: string;
	};
	const message = (value.message ?? 'Синтаксическая ошибка').split('\n')[0];
	const loc = value.loc?.start;
	const compact = /\((\d+):(\d+)\)/.exec(message);
	// eslint-disable-next-line regexp/no-super-linear-backtracking
	const text = /line\s+(\d+).*?column\s+(\d+)/i.exec(message);
	const line = loc?.line ?? Number(compact?.[1] ?? text?.[1] ?? 1);
	const column = loc?.column ?? Number(compact?.[2] ?? text?.[2] ?? 1);

	return {
		line: Number.isFinite(line) ? line : 1,
		column: Number.isFinite(column) ? column : 1,
		message: message.replace(/^SyntaxError:\s*/i, ''),
	};
}

export function validateCode(code: string, language: string): CodeIssue | null {
	const lang = language.toLowerCase();
	const checks = BRACE_LANGUAGES.has(lang) || PRESERVE_INDENT.has(lang);

	if (!checks || !code.trim()) {
		return null;
	}

	const stack: Array<{ char: string; line: number; column: number }> = [];
	const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
	let quote = '';
	let escaped = false;
	let line = 1;
	let column = 0;
	const lineComment = lang === 'python' || lang === 'py' || lang === 'bash' || lang === 'sh' || lang === 'ruby' || lang === 'rb';
	let blockComment = false;

	for (let index = 0; index < code.length; index += 1) {
		const char = code[index];
		const next = code[index + 1];

		if (char === '\n') {
			line += 1;
			column = 0;
			escaped = false;

			if (quote === '`' && lang === 'python') {
				quote = '';
			}
			continue;
		}
		column += 1;

		if (blockComment) {
			if (char === '*' && next === '/') {
				blockComment = false;
				index += 1;
				column += 1;
			}
			continue;
		}

		if (quote) {
			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === quote) {
				quote = '';
			}
			continue;
		}

		if (lineComment && char === '#') {
			while (index < code.length && code[index] !== '\n') {
				index += 1;
			}
			line -= 1;
			continue;
		}

		if (!lineComment && char === '/' && next === '/') {
			while (index < code.length && code[index] !== '\n') {
				index += 1;
			}
			line -= 1;
			continue;
		}

		if (!lineComment && char === '/' && next === '*') {
			blockComment = true;
			index += 1;
			column += 1;
			continue;
		}

		if (char === '"' || char === '\'' || char === '`') {
			quote = char;
			continue;
		}

		if (char === '(' || char === '[' || char === '{') {
			stack.push({ char, line, column });
			continue;
		}

		if (pairs[char]) {
			const open = stack.pop();

			if (!open || open.char !== pairs[char]) {
				return { line, column, message: `Лишняя закрывающая скобка «${char}»` };
			}
		}
	}

	if (quote) {
		return { line, column, message: `Незакрытая строка «${quote}»` };
	}
	if (blockComment) {
		return { line, column, message: 'Незакрытый комментарий' };
	}
	if (stack.length) {
		const open = stack[stack.length - 1];

		return { line: open.line, column: open.column, message: `Незакрытая скобка «${open.char}»` };
	}

	return null;
}

async function formatWithPrettier(code: string, parser: PrettierParser): Promise<string> {
	const [prettier, babel, estree, typescript, html, postcss, markdown, yaml, graphql] =
		await Promise.all([
			import('prettier/standalone'),
			import('prettier/plugins/babel'),
			import('prettier/plugins/estree'),
			import('prettier/plugins/typescript'),
			import('prettier/plugins/html'),
			import('prettier/plugins/postcss'),
			import('prettier/plugins/markdown'),
			import('prettier/plugins/yaml'),
			import('prettier/plugins/graphql'),
		]);
	const plugins = [babel, estree, typescript, html, postcss, markdown, yaml, graphql] as never[];

	return prettier.format(code, {
		parser,
		plugins,
		printWidth: 100,
		singleQuote: true,
		tabWidth: 2,
		useTabs: false,
	});
}

function formatPreservingIndent(code: string): string {
	return code
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((line) => line.replace(/\s+$/, ''))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function formatIndented(code: string): string {
	const lines = code.replace(/\r\n/g, '\n').split('\n');
	let depth = 0;
	const formatted = lines.map((line) => {
		const trimmed = line.trim();
		const closes = /^[}\])]/.test(trimmed);

		if (closes) {
			depth = Math.max(0, depth - 1);
		}
		const result = trimmed ? '  '.repeat(depth) + trimmed : '';
		const opens = (trimmed.match(/[{[(]/g) ?? []).length;
		const shuts = (trimmed.match(/[}\])]/g) ?? []).length;

		depth = Math.max(0, depth + opens - shuts + (closes ? 1 : 0));

		return result;
	});

	return formatted.join('\n');
}
