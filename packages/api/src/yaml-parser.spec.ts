import type { YamlPlatform } from './yaml-parser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { YamlParser } from './yaml-parser';

describe('yamlParser', () => {
	let service: YamlParser;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(YamlParser);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('parses platforms.yaml into maintainers with platforms', () => {
		const yaml = `
- maintainer: Sony
platforms:
- name: PlayStation
code: ps1
icon: ps1.svg
- maintainer: Microsoft
platforms:
- name: Xbox
code: xbox
icon: xbox.svg
`;

		let result: YamlPlatform[] | undefined;

		service.parse().subscribe((data) => {
			result = data;
		});

		const req = http.expectOne('platforms.yaml');
		expect(req.request.responseType).toBe('text');
		req.flush(yaml);

		expect(result).toEqual([
			{
				maintainer: 'Sony',
				platforms: [{ name: 'PlayStation', code: 'ps1', icon: 'ps1.svg' }],
			},
			{
				maintainer: 'Microsoft',
				platforms: [{ name: 'Xbox', code: 'xbox', icon: 'xbox.svg' }],
			},
		]);
	});
});
