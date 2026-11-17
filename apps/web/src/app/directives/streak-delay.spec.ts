import { ChatJuryDelayDirective } from './streak-delay';

describe('chatJuryDelayDirective', () => {
	it('should have a guard that narrows the template context', () => {
		expect(ChatJuryDelayDirective.ngTemplateContextGuard).toBeTypeOf('function');
	});
});
