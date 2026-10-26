import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DateTime } from 'luxon';
import { TimeRow } from './time-row';

describe('timeRow', () => {
	let component: TimeRow;
	let fixture: ComponentFixture<TimeRow>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [TimeRow],
		}).compileComponents();

		fixture = TestBed.createComponent(TimeRow);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders hours, minutes and seconds', () => {
		fixture.componentRef.setInput('time', DateTime.fromObject({ hour: 1, minute: 2, second: 3 }));
		fixture.componentRef.setInput('mode', 'pause');
		fixture.detectChanges();

		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain('01');
		expect(el.textContent).toContain('02');
		expect(el.textContent).toContain('03');
	});

	it('adds pulse class when mode is play', () => {
		fixture.componentRef.setInput('time', DateTime.fromObject({}));
		fixture.componentRef.setInput('mode', 'play');
		fixture.detectChanges();

		const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
		expect(row.classList).toContain('pulse');
	});

	it('does not add pulse class when paused', () => {
		fixture.componentRef.setInput('time', DateTime.fromObject({}));
		fixture.componentRef.setInput('mode', 'pause');
		fixture.detectChanges();

		const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
		expect(row.classList).not.toContain('pulse');
	});
});
