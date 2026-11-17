import type { AppBackendState } from '@shared/services/hotbar.service';
import { TestBed } from '@angular/core/testing';
import { HotbarService } from '@shared/services/hotbar.service';
import { of } from 'rxjs';
import { HotbarStore, padded } from './hotbar.store';

describe('padded', () => {
	it('pads single-digit numbers', () => {
		expect(padded(5)).toBe('05');
	});

	it('does not pad two-digit numbers', () => {
		expect(padded(12)).toBe('12');
	});

	it('pads zero', () => {
		expect(padded(0)).toBe('00');
	});
});

describe('hotbarStore', () => {
	const backendState: AppBackendState = {
		mode: 'solo',
		timerState: {
			mode: 'pause',
			time: { hours: 1, minutes: 2, seconds: 3 },
		},
		hotbarState: {
			platforms: [{ name: 'PlayStation', code: 'ps1', icon: 'ps1.svg', completedGamesCount: 0 }],
		},
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: HotbarService,
					useValue: {
						initialLoad: () => of(backendState),
						updateState: () => of(backendState),
					},
				},
			],
		});
	});

	it('loads state on init', () => {
		const store = TestBed.inject(HotbarStore);

		expect(store.state()).toEqual(backendState);
		expect(store.isLoading()).toBe(false);
	});

	it('exposes computed currentTime from state', () => {
		const store = TestBed.inject(HotbarStore);

		expect(store.currentTime().toFormat('HH:mm:ss')).toBe('01:02:03');
	});

	it('exposes platforms from state', () => {
		const store = TestBed.inject(HotbarStore);

		expect(store.platforms()).toHaveLength(1);
		expect(store.platforms()[0].name).toBe('PlayStation');
	});
});
