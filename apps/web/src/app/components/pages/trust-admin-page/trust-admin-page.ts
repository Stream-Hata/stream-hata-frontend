import type {
	TrustAdminData,
	TrustProduct,
	TrustPublisher,
	TrustRelease,
	TrustSource,
} from '@shared/services/trust.service';
import type { Observable } from 'rxjs';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrustService } from '@shared/services/trust.service';
import { TuiButton } from '@taiga-ui/core';

const EMPTY_DATA: TrustAdminData = { publishers: [], products: [], sources: [], releases: [] };

@Component({
	imports: [TuiButton],
	selector: 'app-trust-admin-page',
	styleUrl: './trust-admin-page.scss',
	templateUrl: './trust-admin-page.html',
})
export default class TrustAdminPage {
	readonly data = signal<TrustAdminData>(EMPTY_DATA);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly saving = signal('');
	readonly message = signal('');

	readonly publisher = signal({ slug: '', name: '', trustLevel: 'official', homepage: '' });
	readonly product = signal({
		publisherId: 0,
		slug: '',
		name: '',
		platform: 'android',
		packageName: '',
		kind: 'app',
	});

	readonly source = signal({ productId: 0, url: '', kind: 'official', trustLevel: 'official' });
	readonly release = signal({
		product: '',
		channel: 'stable',
		version: '',
		versionCode: 0,
		packageName: '',
		sha256: '',
		signatureSha256: '',
		signatureType: 'apk-cert',
		fileSize: 0,
		url: '',
	});

	readonly products = computed(() => this.data().products);
	readonly publishers = computed(() => this.data().publishers);
	readonly sources = computed(() => this.data().sources);
	readonly releases = computed(() => this.data().releases);

	private readonly trust = inject(TrustService);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.trust
			.admin()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.data.set(data);
					this.loading.set(false);
					this.error.set('');
					const publisherId = this.product().publisherId || data.publishers[0]?.id || 0;
					const productId = this.source().productId || data.products[0]?.id || 0;
					const firstProduct = data.products[0];
					this.product.update((value) => ({ ...value, publisherId }));
					this.source.update((value) => ({ ...value, productId }));
					if (!this.release().product && firstProduct) {
						this.release.update((value) => ({
							...value,
							product: `${firstProduct.slug}|${firstProduct.platform}`,
						}));
					}
				},
				error: () => {
					this.loading.set(false);
					this.error.set('Не удалось загрузить trust-реестр.');
				},
			});
	}

	savePublisher(): void {
		this.run('publisher', this.trust.savePublisher(this.publisher()), () =>
			this.publisher.set({ slug: '', name: '', trustLevel: 'official', homepage: '' }));
	}

	saveProduct(): void {
		this.run('product', this.trust.saveProduct(this.product()), () =>
			this.product.update((value) => ({ ...value, slug: '', name: '', packageName: '' })));
	}

	saveSource(): void {
		this.run('source', this.trust.saveSource(this.source()), () =>
			this.source.update((value) => ({ ...value, url: '' })));
	}

	saveRelease(): void {
		const value = this.release();
		const [productSlug, platform] = value.product.split('|');
		if (!productSlug || !platform) {
			this.error.set('Выберите продукт.');
			return;
		}
		this.run(
			'release',
			this.trust.saveRelease({
				productSlug,
				platform,
				channel: value.channel,
				version: value.version,
				versionCode: value.versionCode,
				packageName: value.packageName,
				sha256: value.sha256,
				signatureSha256: value.signatureSha256,
				signatureType: value.signatureType,
				fileSize: value.fileSize,
				url: value.url,
			}),
			() => this.release.update((item) => ({ ...item, version: '', sha256: '', url: '' })),
		);
	}

	deletePublisher(item: TrustPublisher): void {
		this.remove('publisher', this.trust.deletePublisher(item.id));
	}

	deleteProduct(item: TrustProduct): void {
		this.remove('product', this.trust.deleteProduct(item.id));
	}

	deleteSource(item: TrustSource): void {
		this.remove('source', this.trust.deleteSource(item.id));
	}

	deleteRelease(item: TrustRelease): void {
		this.remove('release', this.trust.deleteRelease(item.id));
	}

	private run(kind: string, request: Observable<unknown>, reset: () => void): void {
		if (this.saving()) {
			return;
		}
		this.saving.set(kind);
		this.error.set('');
		this.message.set('');
		request.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					reset();
					this.saving.set('');
					this.message.set('Сохранено.');
					this.load();
				},
				error: () => {
					this.saving.set('');
					this.error.set('Не удалось сохранить запись.');
				},
			});
	}

	private remove(kind: string, request: Observable<unknown>): void {
		if (this.saving()) {
			return;
		}
		this.saving.set(kind);
		this.error.set('');
		request.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.saving.set('');
					this.message.set('Удалено.');
					this.load();
				},
				error: () => {
					this.saving.set('');
					this.error.set('Не удалось удалить запись.');
				},
			});
	}

	setPublisher(field: 'slug' | 'name' | 'trustLevel' | 'homepage', event: Event): void {
		const value = (event.target as HTMLInputElement).value;
		this.publisher.update((item) => ({ ...item, [field]: value }));
	}

	setProduct(
		field: 'publisherId' | 'slug' | 'name' | 'platform' | 'packageName' | 'kind',
		event: Event,
	): void {
		const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
		this.product.update((item) => ({
			...item,
			[field]: field === 'publisherId' ? Number(value) : value,
		}));
	}

	setSource(field: 'productId' | 'url' | 'kind' | 'trustLevel', event: Event): void {
		const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
		this.source.update((item) => ({
			...item,
			[field]: field === 'productId' ? Number(value) : value,
		}));
	}

	setRelease(
		field:
			| 'product'
			| 'channel'
			| 'version'
			| 'versionCode'
			| 'packageName'
			| 'sha256'
			| 'signatureSha256'
			| 'signatureType'
			| 'fileSize'
			| 'url',
		event: Event,
	): void {
		const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
		this.release.update((item) => ({
			...item,
			[field]: field === 'versionCode' || field === 'fileSize' ? Number(value) : value,
		}));
	}
}
