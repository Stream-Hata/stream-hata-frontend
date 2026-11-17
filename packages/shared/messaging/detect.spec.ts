import { describe, expect, it } from 'vitest';
import { detectCodeLanguage } from './message-content';

describe('code language detection', () => {
	it.each([
		['package main\nfunc main() {}', 'go'],
		['defmodule Demo do\nend', 'elixir'],
		['import Foundation\nfunc hi() {}', 'swift'],
		['public class Main { public static void main(String[] a) {} }', 'java'],
		['using System;\nnamespace App;', 'csharp'],
		['fn main() { println!("hi"); }', 'rust'],
		['query User { id }', 'graphql'],
		['FROM node:22\nRUN pnpm build', 'dockerfile'],
		['[package]\nname = "x"', 'toml'],
	])('%s -> %s', (code, language) => {
		expect(detectCodeLanguage(code)).toBe(language);
	});
});
