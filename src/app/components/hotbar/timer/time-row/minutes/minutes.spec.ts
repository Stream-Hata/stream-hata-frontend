import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Minutes } from './minutes';

describe('minutes', () => {
	let component: Minutes;
	let fixture: ComponentFixture<Minutes>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [Minutes],
		}).compileComponents();

		fixture = TestBed.createComponent(Minutes);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders minutes padded to two digits', () => {
		fixture.componentRef.setInput('minutes', 7);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('07');
	});

	it('renders two-digit minutes as-is', () => {
		fixture.componentRef.setInput('minutes', 59);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('59');
	});
});
