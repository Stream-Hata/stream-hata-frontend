import type {
	ActionItem,
	AnalyticsState,
	NotifySettings,
	ObsStatus,
	StreamInfo,
} from '@shared/types/stream';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ObsLocalService } from '@shared/services/obs-local.service';
import { defer, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ObsService {
	private readonly http = inject(HttpClient);
	private readonly local = inject(ObsLocalService);
	private isDesktop(): boolean {
		return (
			this.local.desktop ||
			(typeof window !== 'undefined' &&
				('__TAURI_INTERNALS__' in window ||
					'__TAURI__' in window ||
					(window as unknown as Record<string, unknown>)['__STREAMHATA_DESKTOP__'] === true ||
					navigator.userAgent.includes('NamelessStreamHataDesktop')))
		);
	}

	autoConnect() {
		return this.isDesktop()
			? defer(() => this.local.autoConnect())
			: throwError(() => new Error('Автоподключение OBS доступно только в desktop-приложении'));
	}

	stats() {
		return this.isDesktop()
			? defer(() => this.local.stats())
			: throwError(() => new Error('Здоровье OBS доступно только в desktop-приложении'));
	}

	status() {
		return this.isDesktop()
			? defer(() => this.local.status())
			: this.http.get<ObsStatus>('rgg-sync/obs');
	}

	connect(url: string, password: string) {
		return this.isDesktop()
			? defer(() => this.local.connect(url, password))
			: this.http.post<ObsStatus>('rgg-sync/obs/connect', { url, password });
	}

	disconnect() {
		return this.isDesktop()
			? defer(() => this.local.disconnect())
			: this.http.post<ObsStatus>('rgg-sync/obs/disconnect', {});
	}

	scene(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.scene(scene))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'scene', scene });
	}

	createScene(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.createScene(scene))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'create_scene', scene });
	}

	reorderScene(scene: string, index: number) {
		return this.isDesktop()
			? defer(() => this.local.reorderScene(scene, index))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'reorder_scene', scene, index });
	}

	mute(input: string) {
		return this.isDesktop()
			? defer(() => this.local.mute(input))
			: this.http.post<{ muted: boolean }>('rgg-sync/obs/action', { type: 'mute', input });
	}

	output(output: string, action: string) {
		return this.isDesktop()
			? defer(() => this.local.output(output, action))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'output', output, action });
	}

	sceneItems(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.sceneItems(scene))
			: throwError(() => new Error('Визуальный редактор доступен только в desktop-приложении'));
	}

	sceneScreenshot(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.sceneScreenshot(scene))
			: throwError(() => new Error('Визуальный редактор доступен только в desktop-приложении'));
	}

	updateSceneItemTransform(scene: string, id: number, transform: import('@shared/types/stream').ObsTransform) {
		return this.isDesktop()
			? defer(() => this.local.updateSceneItemTransform(scene, id, transform))
			: throwError(() => new Error('Визуальный редактор доступен только в desktop-приложении'));
	}

	setSceneItemEnabled(scene: string, id: number, enabled: boolean) {
		return this.isDesktop()
			? defer(() => this.local.setSceneItemEnabled(scene, id, enabled))
			: throwError(() => new Error('Desktop only'));
	}

	setSceneItemLocked(scene: string, id: number, locked: boolean) {
		return this.isDesktop()
			? defer(() => this.local.setSceneItemLocked(scene, id, locked))
			: throwError(() => new Error('Desktop only'));
	}

	setSceneItemIndex(scene: string, id: number, index: number) {
		return this.isDesktop()
			? defer(() => this.local.setSceneItemIndex(scene, id, index))
			: throwError(() => new Error('Desktop only'));
	}

	removeSceneItem(scene: string, id: number) {
		return this.isDesktop()
			? defer(() => this.local.removeSceneItem(scene, id))
			: throwError(() => new Error('Desktop only'));
	}

	createSceneItem(scene: string, source: string) {
		return this.isDesktop()
			? defer(() => this.local.createSceneItem(scene, source))
			: throwError(() => new Error('Desktop only'));
	}

	openInputProperties(input: string) {
		return this.isDesktop()
			? defer(() => this.local.openInputProperties(input))
			: throwError(() => new Error('Настройки источника доступны только в desktop-приложении'));
	}

	inputSettings(input: string) {
		return this.isDesktop()
			? defer(() => this.local.inputSettings(input))
			: throwError(() => new Error('Настройки источника доступны только в desktop-приложении'));
	}

	setInputSettings(input: string, settings: Record<string, unknown>) {
		return this.isDesktop()
			? defer(() => this.local.setInputSettings(input, settings))
			: throwError(() => new Error('Настройки источника доступны только в desktop-приложении'));
	}

	deleteScene(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.deleteScene(scene))
			: throwError(() => new Error('Desktop only'));
	}

	renameScene(scene: string, name: string) {
		return this.isDesktop()
			? defer(() => this.local.renameScene(scene, name))
			: throwError(() => new Error('Desktop only'));
	}
}

@Injectable({ providedIn: 'root' })
export class StreamService {
	private readonly http = inject(HttpClient);

	info() {
		return this.http.get<StreamInfo>('rgg-sync/stream');
	}

	update(title: string, gameQuery: string) {
		return this.http.post<StreamInfo>('rgg-sync/stream', { title, gameQuery });
	}

	commercial(length: number) {
		return this.http.post<unknown>('rgg-sync/stream/commercial', { length });
	}

	shield(active: boolean) {
		return this.http.post<unknown>('rgg-sync/stream/shield', { active });
	}
}

@Injectable({ providedIn: 'root' })
export class NotifyService {
	private readonly http = inject(HttpClient);

	settings() {
		return this.http.get<NotifySettings>('rgg-sync/notify');
	}

	save(settings: NotifySettings) {
		return this.http.post<NotifySettings>('rgg-sync/notify', settings);
	}

	test() {
		return this.http.post<{ ok: boolean }>('rgg-sync/notify/test', {});
	}

	chats() {
		return this.http.get<{
			chats: { id: number; title?: string; username?: string; type?: string }[];
		}>('rgg-sync/notify/telegram/chats');
	}
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
	private readonly http = inject(HttpClient);

	state() {
		return this.http.get<AnalyticsState>('rgg-sync/analytics');
	}

	get exportUrl(): string {
		return 'rgg-sync/analytics/export';
	}

	actions() {
		return this.http.get<{ actions: ActionItem[] }>('rgg-sync/actions');
	}
}
