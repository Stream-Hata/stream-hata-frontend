import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('icon', () => {
	let component: Icon;
	let fixture: ComponentFixture<Icon>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Icon],
		}).compileComponents();

		fixture = TestBed.createComponent(Icon);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
