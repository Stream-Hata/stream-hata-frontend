import type { ComponentFixture } from '@angular/core/testing';
import type { Platform, YamlPlatform } from '../../../../../shared/services/yaml-parser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlatformBar } from '../../../../../shared/services/platform-bar';
import { PlatformMaintainer } from './platform-maintainer';

const sonyPlatforms: Platform[] = [
	{ name: 'PlayStation', code: 'ps1', icon: 'ps1.svg' },
	{ name: 'PlayStation 2', code: 'ps2', icon: 'ps2.svg' },
];

const data: YamlPlatform = {
	maintainer: 'Sony',
	platforms: sonyPlatforms,
};

describe('platformMaintainer', () => {
	let component: PlatformMaintainer;
	let fixture: ComponentFixture<PlatformMaintainer>;
	let selected: ReturnType<typeof signal<Platform[]>>;
	let toggleSelected: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		selected = signal<Platform[]>([]);
		toggleSelected = vi.fn((item: Platform) => {
			const exists = selected().some((p) => p.code === item.code);

			selected.set(exists ? selected().filter((p) => p.code !== item.code) : [...selected(), item]);

			return of(undefined);
		});

		await TestBed.configureTestingModule({
			imports: [PlatformMaintainer],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: PlatformBar,
					useValue: { selected, toggleSelected },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(PlatformMaintainer);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('data', data);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders maintainer name and platform chips', () => {
		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain('Sony');
		expect(el.textContent).toContain('PlayStation');
		expect(el.textContent).toContain('PlayStation 2');
	});

	it('toggles platform selection on chip click', () => {
		const chip = (fixture.nativeElement as HTMLElement).querySelectorAll('.chip')[0] as HTMLElement;
		chip.click();

		expect(toggleSelected).toHaveBeenCalledWith(sonyPlatforms[0]);
		fixture.detectChanges();
		expect(chip.classList).toContain('selected');
	});

	it('marks already-selected platforms', () => {
		selected.set([sonyPlatforms[1]]);
		fixture.detectChanges();

		const chip = (fixture.nativeElement as HTMLElement).querySelectorAll('.chip')[1] as HTMLElement;
		expect(chip.classList).toContain('selected');
	});
});
