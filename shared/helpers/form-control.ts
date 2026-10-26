import type { Injector, WritableSignal } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import { DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

export function signalControl<T>(
	source: WritableSignal<T>,
	injector: Injector,
	validators: ValidatorFn[] = [],
): FormControl<T> {
	const control = new FormControl(source(), {
		nonNullable: true,
		validators,
	}) as FormControl<T>;
	const destroyRef = injector.get(DestroyRef);

	control.valueChanges
		.pipe(takeUntilDestroyed(destroyRef))
		.subscribe((value) => source.set(value));

	effect(
		() => {
			const value = source();

			if (control.value !== value) {
				control.setValue(value, { emitEvent: false });
			}
		},
		{ injector },
	);

	return control;
}
