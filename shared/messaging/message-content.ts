export type MediaKind = 'image' | 'audio' | 'video' | 'file' | 'link';

export interface MessageSpan {
	kind: 'text' | 'bold' | 'italic' | 'code' | 'codeblock' | 'spoiler' | 'link' | 'mention' | 'color';
	language?: string;
	color?: string;
	text: string;
	url?: string;
}

export interface MediaAttachment {
	kind: MediaKind;
	url: string;
}

export interface ParsedMessage {
	spans: MessageSpan[];
	media: MediaAttachment[];
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+|\/rgg-sync\/media\/file\/[^\s<>"']+/gi;
const IMAGE_EXTENSIONS = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const AUDIO_EXTENSIONS = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(?:m3u8|m4v|mkv|mov|mp4|ogv|webm)(?:[?#].*)?$/i;

export function parseMessageContent(raw: string): ParsedMessage {
	const text = raw.replace(/\r\n/g, '\n').slice(0, 8192);
	const media: MediaAttachment[] = [];
	const mediaUrls = new Set<string>();

	const textForMedia = text.replace(/```[^\n]*\n[\s\S]*?```/g, ' ');

	for (const match of textForMedia.matchAll(URL_PATTERN)) {
		const url = match[0].replace(/[),.!?]+$/, '');
		const kind = detectMediaKind(url);

		if (kind !== 'link' && !mediaUrls.has(url)) {
			mediaUrls.add(url);
			media.push({ kind, url });
		}
	}

	return { spans: parseRichSpans(text), media };
}

export function detectMediaKind(url: string): MediaKind {
	if (/[?&]document=1(?:&|$)/i.test(url)) return 'file';
	if (IMAGE_EXTENSIONS.test(url)) return 'image';
	if (AUDIO_EXTENSIONS.test(url)) return 'audio';
	if (VIDEO_EXTENSIONS.test(url)) return 'video';

	return 'link';
}

function parseRichSpans(text: string): MessageSpan[] {
	const spans: MessageSpan[] = [];
	const fence = /```([^\n`]*)\n([\s\S]*?)```/g;
	let cursor = 0;

	for (const match of text.matchAll(fence)) {
		const index = match.index ?? 0;
		if (index > cursor) {
			spans.push(...parseInlineSpans(text.slice(cursor, index)));
		}
		const code = match[2]?.replace(/\n$/, '') ?? '';
		spans.push({
			kind: 'codeblock',
			language: match[1]?.trim() || detectCodeLanguage(code),
			text: code,
		});
		cursor = index + match[0].length;
	}

	if (cursor < text.length) {
		spans.push(...parseInlineSpans(text.slice(cursor)));
	}

	return spans.length ? spans : parseInlineSpans(text);
}

function parseInlineSpans(text: string): MessageSpan[] {
	const spans: MessageSpan[] = [];
	const pattern = /\{color:#?[0-9a-fA-F]{3,8}\}[\s\S]*?\{\/color\}|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\|\|[^|]+\|\||\[[^\]]+\]\([^)]+\)|@\w+/g;
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const token = match[0];
		const index = match.index ?? 0;

		if (index > cursor) {
			spans.push({ kind: 'text', text: text.slice(cursor, index) });
		}
		if (token.startsWith('{color:')) {
			const end = token.indexOf('}');
			spans.push({
				kind: 'color',
				color: token.slice(7, end),
				text: token.slice(end + 1, -8),
			});
		} else if (token.startsWith('**')) {
			spans.push({ kind: 'bold', text: token.slice(2, -2) });
		} else if (token.startsWith('__')) {
			spans.push({ kind: 'italic', text: token.slice(2, -2) });
		} else if (token.startsWith('`')) {
			spans.push({ kind: 'code', text: token.slice(1, -1) });
		} else if (token.startsWith('||')) {
			spans.push({ kind: 'spoiler', text: token.slice(2, -2) });
		} else if (token.startsWith('[')) {
			const split = token.indexOf('](');

			spans.push({
				kind: 'link',
				text: token.slice(1, split),
				url: token.slice(split + 2, -1),
			});
		} else {
			spans.push({ kind: 'mention', text: token });
		}
		cursor = index + token.length;
	}

	if (cursor < text.length) {
		spans.push({ kind: 'text', text: text.slice(cursor) });
	}

	return spans;
}

export function detectCodeLanguage(code: string): string | undefined {
	const value = code.trim();

	if (!value) return undefined;
	try {
		JSON.parse(value);
		if (value.startsWith('{') || value.startsWith('[')) return 'json';
	} catch {
		// not JSON
	}
	if (/^#!\/.*\b(?:ba|z|fi)?sh\b/m.test(value)) return 'bash';
	if (/^\s*(?:param\s*\(|\$env:|Write-Host\b)/im.test(value)) return 'powershell';
	if (/^\s*(?:query|mutation|subscription|fragment)\s+\w+/m.test(value)) return 'graphql';
	if (/^\s*<\?php/im.test(value)) return 'php';
	if (/^\s*<template[\s>]/im.test(value) && /<\/script>/i.test(value)) return 'vue';
	if (/^\s*<(?:!doctype|html|head|body|div|span|template|script|style)\b/im.test(value) || /<\/?(?:html|body|div|span|section|main)\b/i.test(value)) return 'html';
	if (/^\s*<\?xml[\s>]/im.test(value)) return 'xml';
	if (/^\s*syntax\s*=\s*"proto\d"/m.test(value) || /^\s*message\s+\w+\s*\{/m.test(value)) return 'protobuf';
	if (/^\s*pragma\s+solidity\b/m.test(value)) return 'solidity';
	if (/^\s*FROM\s+\S+\s*(?:AS\s+\w+\s*)?$/im.test(value) && /^\s*(?:RUN|CMD|ENTRYPOINT|COPY|WORKDIR|ENV|EXPOSE)\s+/im.test(value)) return 'dockerfile';
	if (/^\s*(?:diff --git|@@\s+-?\d)/m.test(value)) return 'diff';
	if (/^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH|DROP|TRUNCATE)\b/im.test(value)) return 'sql';
	if (/^\s*\[[\w.-]+\]\s*$/m.test(value) && /^\s*[\w.-]+\s*=\s*(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/m.test(value)) return 'toml';
	if (/^\s*---\s*$/m.test(value) && /^\s*[\w.-]+:\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/m.test(value)) return 'yaml';
	if (/^\s*#[^\n]*\n/m.test(value) && /^\s*[\w.-]+:\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/m.test(value)) return 'yaml';
	if (/^\s*#include\b/m.test(value) || /\bint\s+main\s*\(/.test(value)) return 'c';
	if (/^\s*using\s+System\b/m.test(value) || /^\s*namespace\s+[\w.]+\s*[;{]/m.test(value)) return 'csharp';
	if (/^\s*(?:public|private|protected)\s+(?:static\s+)?(?:class|interface|enum|void)\b/m.test(value) || /System\.out\./.test(value) || /^\s*import\s+java\./m.test(value)) return 'java';
	if (/^\s*(?:fun\s+\w+|val\s+\w+|import\s+kotlin\.)/m.test(value)) return 'kotlin';
	if (/^\s*import\s+(?:Foundation|Swift)\b/m.test(value) || /@main\b/.test(value) || /^\s*func\s+\w+\s*\([^)]*\)\s*->/m.test(value)) return 'swift';
	if (/^\s*(?:package\s+\w+|func\s+\w+\s*\()/m.test(value) || /:=/.test(value)) return 'go';
	if (/^\s*(?:fn\s+\w+|let\s+mut\b|impl\s+\w+|use\s+std::)/m.test(value) || /->\s*[\w&]/.test(value)) return 'rust';
	if (/^\s*import\s+'package:/m.test(value) || /Widget\s+build\s*\(/.test(value)) return 'dart';
	if (/^\s*(?:object|case\s+class)\s+\w+/m.test(value) || /^\s*def\s+\w.*=\s*/m.test(value)) return 'scala';
	if (/^\s*defmodule\s+\w+/m.test(value) || (/^\s*defp?\s+\w.+\bdo\b/m.test(value) && /\bend\b/.test(value))) return 'elixir';
	if (/^\s*(?:module\s+\w+\s+where|import\s+qualified)/m.test(value) || /::\s*[A-Z]/.test(value)) return 'haskell';
	if (/^\s*def\s+\w+\s*\(.*\)\s*:/m.test(value) || /^\s*class\s+\w.*:/m.test(value)) return 'python';
	if ((/^\s*(?:def|class)\s+\w+/m.test(value) && /\bend\b/.test(value)) || /^\s*(?:puts|require)\s+/m.test(value)) return 'ruby';
	if (/^\s*(?:local\s+\w+|function\s+\w+\s*\()/m.test(value) && /\bend\b/.test(value)) return 'lua';
	if (/^\s*(?:function\s+\w+|using\s+\w+)/m.test(value) && /\bend\b/.test(value)) return 'julia';
	if (/^\s*<-/m.test(value) || /^\s*library\(/m.test(value)) return 'r';
	if (/^\s*(?:use\s+strict|my\s+\$)/m.test(value)) return 'perl';
	if (/^\s*const\s+std\b/m.test(value)) return 'zig';
	if (/^\s*proc\s+\w+/m.test(value)) return 'nim';
	if (/^\s*\(defn?\s+/m.test(value)) return 'clojure';
	if (/^\s*\\documentclass\b/m.test(value)) return 'latex';
	if (/^\s*[\w./-]+:(?:\s|$)/m.test(value) && /^\t/m.test(value)) return 'makefile';
	if (/^\s*(?:interface|type)\s+\w+|:\s*(?:string|number|boolean)\b/m.test(value)) return 'ts';
	if (/\b(?:const|let|var)\s+\w+|=>|function\s+\w+\s*\(/.test(value)) return 'js';
	if (/^\s*(?:echo|export)\s+/m.test(value)) return 'bash';
	if (/^\s*(?:#{1,6}\s+|[-*]\s+)/m.test(value)) return 'markdown';
	if (
		/^\s*[\w.-]+:\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/m.test(value)
		|| /^---\s*$/m.test(value)
	) {
		return 'yaml';
	}

	return undefined;
}
