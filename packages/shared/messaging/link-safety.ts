export type LinkSafetyVerdict = 'safe' | 'unknown' | 'suspicious' | 'malicious' | 'download';

export interface LinkSafety {
	verdict: LinkSafetyVerdict;
	reason: string;
}

const SHORTENERS = new Set([
	'bit.ly',
	'tinyurl.com',
	't.co',
	'goo.gl',
	'cutt.ly',
	'is.gd',
	'shorturl.at',
	'clck.ru',
	'vk.cc',
]);

const COMMUNITY_HOSTS = new Set(['4pda.to', '4pda.ru', 'forum.4pda.to']);

const DOWNLOAD_EXTENSIONS = new Set([
	'.apk',
	'.apks',
	'.xapk',
	'.exe',
	'.msi',
	'.msix',
	'.dmg',
	'.pkg',
	'.ipa',
	'.zip',
	'.rar',
	'.7z',
	'.tar',
	'.gz',
	'.deb',
	'.rpm',
	'.appimage',
]);

export function inspectLink(raw: string): LinkSafety {
	let url: URL;

	try {
		url = new URL(raw);
	} catch {
		return { verdict: 'malicious', reason: 'Некорректная ссылка' };
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { verdict: 'malicious', reason: 'Неподдерживаемая схема ссылки' };
	}

	if (url.username || url.password) {
		return { verdict: 'malicious', reason: 'В ссылке есть логин или пароль' };
	}

	const host = url.hostname.toLowerCase().replace(/\.$/, '');

	if (
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host.endsWith('.local') ||
		privateHost(host)
	) {
		return { verdict: 'malicious', reason: 'Ссылка ведёт на локальный или приватный адрес' };
	}

	if (host.includes('xn--') || host !== host.normalize('NFKC')) {
		return { verdict: 'suspicious', reason: 'Домен замаскирован через punycode' };
	}

	if (COMMUNITY_HOSTS.has(host) || [...COMMUNITY_HOSTS].some((item) => host.endsWith(`.${item}`))) {
		return { verdict: 'suspicious', reason: 'Сторонний форум или community-источник' };
	}

	if (SHORTENERS.has(host)) {
		return { verdict: 'suspicious', reason: 'Сокращатель ссылок скрывает адрес' };
	}

	const extension = url.pathname.slice(url.pathname.lastIndexOf('.')).toLowerCase();

	if (DOWNLOAD_EXTENSIONS.has(extension)) {
		return { verdict: 'download', reason: 'Ссылка ведёт на исполняемый файл или архив' };
	}

	return { verdict: 'unknown', reason: 'Репутация ссылки неизвестна' };
}

function privateHost(host: string): boolean {
	const parts = host.split('.').map((part) => Number(part));

	if (
		parts.length !== 4 ||
		parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
	) {
		return false;
	}

	const [a, b] = parts;

	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 100 && b >= 64 && b <= 127) ||
		a >= 224
	);
}
