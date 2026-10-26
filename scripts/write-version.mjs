import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const blocks = changelog.split(/^##\s+/m).slice(1);

function parseItem(line) {
	const text = line.replace(/^-\s+/, '').trim();
	const match = text.match(/^(.*?)\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*[).!]*\s*$/);

	return match
		? { text: match[1].trim().replace(/[\s(]+$/, ''), linkLabel: match[2], url: match[3] }
		: { text };
}

const versions = blocks.map((block) => {
	const [heading, ...lines] = block.split('\n');
	const [version, date] = heading.replace(/\]/g, '').split(' - ');
	const sections = [];
	let current = null;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith('### ')) {
			current = { title: trimmed.slice(4).trim(), items: [] };
			sections.push(current);
		} else if (trimmed.startsWith('- ') && current) {
			current.items.push(parseItem(trimmed));
		}
	}

	return {
		version: version.replace('[', '').trim(),
		date: (date ?? '').trim(),
		sections: sections.filter((section) => section.items.length),
	};
});

const latest = versions[0] ?? { version: pkg.version, sections: [] };
const notes = latest.sections.flatMap((section) => section.items.map((item) => item.text));
const payload = {
	version: pkg.version,
	build: new Date().toISOString(),
	notes,
};

writeFileSync(new URL('../public/version.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(new URL('../public/changelog.json', import.meta.url), `${JSON.stringify(versions, null, 2)}\n`);
