export function imageUrl(url: string | null | undefined): string {
	return url ? `rgg-sync/catalog/image?url=${encodeURIComponent(url)}` : '';
}
