import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatLiveService } from './chat-live.service';

describe('chatLiveService', () => {
	let service: ChatLiveService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		service = TestBed.inject(ChatLiveService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('requests recent messages with limit', () => {
		service.recent(50).subscribe((response) => expect(response.messages).toEqual([]));

		const request = http.expectOne('rgg-sync/chat/recent?limit=50');
		expect(request.request.method).toBe('GET');
		request.flush({ messages: [] });
	});

	it('requests emotes snapshot', () => {
		service.emotes().subscribe((response) => expect(response.twitchTemplate).toContain('%s'));

		const request = http.expectOne('rgg-sync/emotes');
		request.flush({
			sevenTV: { emotes: { cat: 'url' }, updatedAt: '' },
			twitchTemplate: 'https://cdn/%s',
		});
	});
});
