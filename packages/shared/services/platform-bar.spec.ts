import { TestBed } from '@angular/core/testing';
import { PlatformBar } from './platform-bar';

describe('platformBar', () => {
	let service: PlatformBar;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(PlatformBar);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
