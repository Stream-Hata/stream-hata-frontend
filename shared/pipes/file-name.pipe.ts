import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fileName', standalone: true })
export class FileNamePipe implements PipeTransform {
	transform(value: File | File[] | null | undefined): string {
		if (Array.isArray(value)) {
			return value[0]?.name ?? '';
		}

		return value?.name ?? '';
	}
}
