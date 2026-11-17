import type { Type } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import type { PlatformInfo } from '../../types/hotbar-state';
import { TestBed } from '@angular/core/testing';
import { Slot } from './slot';

const platform: PlatformInfo = {
	name: 'PlayStation',
	code: 'ps1',
	icon: 'ps1.svg',
	completedGamesCount: 3,
};

describe('slot', () => {
	let component: Slot<PlatformInfo>;
	let fixture: ComponentFixture<Slot<PlatformInfo>>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Slot],
		}).compileComponents();

		fixture = TestBed.createComponent(Slot as Type<Slot<PlatformInfo>>);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders platform name, counter and icon', () => {
		fixture.componentRef.setInput('data', platform);
		fixture.detectChanges();

		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain('PlayStation');
		expect(el.textContent).toContain('3');
		expect(el.querySelector('img')?.getAttribute('src')).toBe('icons/platforms/ps1.svg');
	});
});
