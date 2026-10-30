import type { TranslationKey } from '@shared/services/i18n.service';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@shared/services/i18n.service';

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
	private readonly i18n = inject(I18nService);

	transform(key: TranslationKey): string {
		return this.i18n.t(key);
	}
}
