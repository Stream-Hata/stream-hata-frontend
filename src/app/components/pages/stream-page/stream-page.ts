import type { ElementRef } from '@angular/core';
import type {
	NotifySettings,
	ObsSceneItem,
	ObsSceneSnapshot,
	ObsStats,
	ObsStatus,
	ObsTransform,
	StreamInfo,
} from '@shared/types/stream';
import { AfterViewInit, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NotifyService, ObsService, StreamService } from '@shared/services/stream.services';
import { ObsAutoSceneService } from '@shared/services/obs-auto-scene.service';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiButton, TuiIcon, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiButtonCopy, TuiChevron, TuiDataListWrapper, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, finalize, map, merge, of, switchMap, timer } from 'rxjs';
import { Timer as HotbarTimer } from '../../hotbar/timer/timer';
import { TimerPreview } from '../../widgets/timer-preview/timer-preview';

@Component({
	imports: [
		TuiBadge,
		TuiButton,
		TuiButtonCopy,
		TuiChevron,
		TuiDataListWrapper,
		TuiIcon,
		TuiInput,
		TuiSelectLike,
		TuiSwitch,
		TuiTextarea,
		TuiTextfield,
		// eslint-disable-next-line local/component-imports-unused
		HotbarTimer,
		TimerPreview,
	],
	selector: 'app-stream-page',
	styleUrl: './stream-page.scss',
	templateUrl: './stream-page.html',
})
export default class StreamPage implements AfterViewInit {
	private readonly obs = inject(ObsService);
	private readonly stream = inject(StreamService);
	readonly autoScene = inject(ObsAutoSceneService);
	readonly autoSceneGame = signal('');
	readonly autoSceneTarget = signal('');
	private readonly notify = inject(NotifyService);
	private readonly twitchService = inject(TwitchService);
	private readonly destroyRef = inject(DestroyRef);

	readonly refresh = signal(0);

	readonly obsStatus = toSignal(
		merge(timer(0, 5000), toObservable(this.refresh)).pipe(
			switchMap(() => this.obs.status().pipe(catchError(() => of(null as ObsStatus | null)))),
		),
		{ initialValue: null as ObsStatus | null },
	);

	readonly streamInfo = toSignal(
		merge(timer(0, 20000), toObservable(this.refresh)).pipe(
			switchMap(() => this.stream.info().pipe(catchError(() => of(null as StreamInfo | null)))),
		),
		{ initialValue: null as StreamInfo | null },
	);

	readonly twitchOnline = toSignal(
		timer(0, 15000).pipe(
			switchMap(() => this.twitchService.login().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly streamActive = computed(() => Boolean(this.obsStatus()?.streaming));
	readonly obsStats = toSignal(
		timer(0, 3000).pipe(
			switchMap(() => this.obs.stats().pipe(catchError(() => of(null as ObsStats | null)))),
		),
		{ initialValue: null as ObsStats | null },
	);
	readonly health = computed(() => {
		const stats = this.obsStats();

		if (!stats) {
			return { label: 'Нет данных', tone: 'neutral', detail: 'OBS не подключён или ещё не передал статистику.' };
		}
		const skipped = stats.outputSkippedFrames + stats.renderSkippedFrames;

		if (skipped > 0 || stats.averageFrameRenderTime > 24) {
			return {
				label: 'Есть риск',
				tone: 'warning',
				detail: `Пропущено кадров: ${skipped}. Среднее время кадра ${stats.averageFrameRenderTime.toFixed(1)} мс — проверьте энкодер и нагрузку.`,
			};
		}
		if (stats.activeFps > 0 && stats.activeFps < 24) {
			return {
				label: 'Низкий FPS',
				tone: 'warning',
				detail: `OBS отдаёт ${stats.activeFps.toFixed(1)} FPS. Проверьте сцену, источники и лимиты энкодера.`,
			};
		}

		return {
			label: 'Норма',
			tone: 'positive',
			detail: `${stats.activeFps.toFixed(0)} FPS · кадр ${stats.averageFrameRenderTime.toFixed(1)} мс · пропусков ${skipped}.`,
		};
	});

	readonly notifySettings = toSignal(
		merge(timer(0, 30000), toObservable(this.refresh)).pipe(
			switchMap(() => this.notify.settings().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly editorScene = signal('');
	readonly editor = signal<ObsSceneSnapshot | null>(null);
	readonly screenshot = signal('');
	readonly screenshotError = signal('');
	readonly screenshotEnabled = signal(true);
	readonly dragGhost = signal<{ x: number; y: number; label: string } | null>(null);
	readonly sourceDragActive = signal(false);
	readonly orderTargetId = signal<number | null>(null);
	readonly draggingItemId = signal<number | null>(null);
	readonly settlingItemId = signal<number | null>(null);
	readonly settingsOpen = signal(false);
	readonly settingsInput = signal('');
	readonly settingsKind = signal('');
	readonly settingsValues = signal<Record<string, unknown>>({});
	readonly settingsLoading = signal(false);
	readonly settingsSaving = signal(false);
	readonly settingsError = signal('');
	readonly contextMenu = signal<{ x: number; y: number } | null>(null);
	readonly selectedItemId = signal<number | null>(null);
	readonly sourceToAdd = signal('');
	readonly editorError = signal('');
	readonly editorCanvas = viewChild<ElementRef<HTMLDivElement>>('editorCanvas');
	readonly editorCard = viewChild<ElementRef<HTMLElement>>('editorCard');
	readonly showPip = signal(false);
	readonly editorSceneLabel = computed(
		() => this.editorScene() || this.obsStatus()?.currentScene || 'Сцена',
	);

	readonly editorWidth = computed(() => this.editor()?.video?.baseWidth || 1920);
	readonly editorHeight = computed(() => this.editor()?.video?.baseHeight || 1080);
	readonly editorAspect = computed(() => `${this.editorWidth()} / ${this.editorHeight()}`);

	readonly sourceToAddLabel = computed(() => this.sourceToAdd() || 'Источник');
	readonly autoSceneTargetLabel = computed(() => this.autoSceneTarget() || 'Сцена');
	readonly settingsEntries = computed(() =>
		Object.entries(this.settingsValues()).map(([key, value]) => ({
			key,
			value,
			type: this.settingType(value),
		})),
	);
	readonly selectedItem = computed(() =>
		this.editor()?.items.find((item) => item.id === this.selectedItemId()) ?? null,
	);
	readonly sceneOrder = computed(() =>
		[...(this.editor()?.items ?? [])].sort((left, right) => right.index - left.index),
	);
	readonly availableInputs = computed(() => {
		const used = new Set(
			this.editor()?.items.map((item) => item.sourceName) ?? this.obsStatus()?.sources ?? [],
		);

		return (this.obsStatus()?.inputs ?? []).filter((input) => !used.has(input));
	});

	private editorTimer: ReturnType<typeof setInterval> | null = null;
	private screenshotTimer: ReturnType<typeof setInterval> | null = null;
	private editorBusy = false;
	private screenshotBusy = false;
	private pageVisible = !document.hidden;
	private dragCleanup: (() => void) | null = null;
	private sourceDrag: { source: string; startX: number; startY: number; moved: boolean } | null = null;
	private orderDrag: { id: number; startY: number; moved: boolean } | null = null;
	private lastCanvasDropAt = 0;
	private drag: {
		id: number;
		scene: string;
		mode: 'move' | 'resize';
		startX: number;
		startY: number;
		x: number;
		y: number;
		width: number;
		height: number;
		rotation: number;
		scaleX: number;
		scaleY: number;
	} | null = null;

	readonly obsUrl = signal('ws://127.0.0.1:4455');
	readonly obsPassword = signal('');
	readonly newScene = signal('');
	private draggedScene = '';
	readonly obsError = signal<string | null>(null);

	readonly title = signal('');
	readonly gameQuery = signal('');
	readonly streamSaved = signal(false);

	readonly discordWebhook = signal('');
	readonly telegramToken = signal('');
	readonly telegramChatId = signal('');
	readonly notifySaved = signal(false);

	private infoLoaded = false;
	private notifyLoaded = false;
	private autoObsTried = false;
	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;

	ngAfterViewInit(): void {
		const updatePip = (): void => {
			const card = this.editorCard()?.nativeElement;

			if (!card) {
				return;
			}
			const rect = card.getBoundingClientRect();
			this.showPip.set(rect.bottom < 80 && !this.settingsOpen());
		};
		const onScroll = (): void => updatePip();

		updatePip();
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onScroll);
		this.destroyRef.onDestroy(() => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onScroll);
		});
	}

	constructor() {
		this.stream
			.info()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (info) => {
					if (!this.infoLoaded && info) {
						this.infoLoaded = true;
						this.title.set(info.title);
						this.gameQuery.set(info.gameName);
					}
				},
				error: () => undefined,
			});

		this.notify
			.settings()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (settings) => {
					if (!this.notifyLoaded && settings) {
						this.notifyLoaded = true;
						this.applyNotify(settings);
					}
				},
				error: () => undefined,
			});

		if (this.desktop) {
			setTimeout(() => this.autoConnectObs(), 1500);
		}

		this.startEditorTimers();
		const onVisibility = (): void => {
			this.pageVisible = !document.hidden;
			if (this.pageVisible) {
				this.startEditorTimers();
			} else {
				this.stopEditorTimers();
			}
		};
		document.addEventListener('visibilitychange', onVisibility);
		this.destroyRef.onDestroy(() => {
			document.removeEventListener('visibilitychange', onVisibility);
			this.stopEditorTimers();
			this.dragCleanup?.();
		});
	}

	private startEditorTimers(): void {
		this.stopEditorTimers();
		if (!this.pageVisible) {
			return;
		}
		this.editorTimer = setInterval(() => this.loadEditor(), 4000);
		this.screenshotTimer = setInterval(() => this.loadScreenshot(), 33);
	}

	private stopEditorTimers(): void {
		if (this.editorTimer) {
			clearInterval(this.editorTimer);
			this.editorTimer = null;
		}
		if (this.screenshotTimer) {
			clearInterval(this.screenshotTimer);
			this.screenshotTimer = null;
		}
	}

	toggleScreenshot(): void {
		this.screenshotEnabled.update((value) => !value);
		if (this.screenshotEnabled()) {
			this.loadScreenshot();
		} else {
			this.screenshot.set('');
			this.screenshotError.set('');
		}
	}

	private autoConnectObs(): void {
		if (this.autoObsTried || this.obsStatus()?.connected) {
			return;
		}

		this.autoObsTried = true;
		this.obs.autoConnect().subscribe({
			next: () => this.refresh.update((value) => value + 1),
			error: () => undefined,
		});
	}

	get deckUrl(): string {
		return `${location.origin}/rgg-sync/actions`;
	}

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	private errorText(error: unknown, fallback: string): string {
		if (typeof error === 'string' && error) {
			return error;
		}
		if (error instanceof Error && error.message) {
			return error.message;
		}
		if (error && typeof error === 'object' && 'message' in error) {
			const message = (error as { message?: unknown }).message;
			if (typeof message === 'string' && message) {
				return message;
			}
		}

		return fallback;
	}

	connectObs(): void {
		this.obsError.set(null);

		this.obs.connect(this.obsUrl(), this.obsPassword()).subscribe({
			next: () => {
				this.obsPassword.set('');
				this.refresh.update((v) => v + 1);
			},
			error: (response) => {
				this.obsError.set(response.error?.error ?? 'Не удалось подключиться к OBS');
			},
		});
	}

	disconnectObs(): void {
		this.obs.disconnect().subscribe(() => this.refresh.update((v) => v + 1));
	}

	createScene(): void {
		const scene = this.newScene().trim();

		if (!scene) {
			return;
		}
		if (!this.obsStatus()?.connected) {
			this.editorError.set('OBS не подключён: сначала подключите WebSocket');
			return;
		}
		this.editorError.set('');
		this.obs.createScene(scene).subscribe({
			next: () => {
				this.newScene.set('');
				this.refresh.update((value) => value + 1);
			},
			error: (error) => this.editorError.set(this.errorText(error, 'OBS не создал сцену')),
		});
	}

	startSceneDrag(scene: string): void {
		this.draggedScene = scene;
	}

	dropScene(target: string): void {
		const source = this.draggedScene;
		this.draggedScene = '';

		if (!source || source === target) {
			return;
		}

		const scenes = this.obsStatus()?.scenes ?? [];
		const index = scenes.indexOf(target);

		if (index < 0) {
			return;
		}

		this.obs.reorderScene(source, index).subscribe(() => this.refresh.update((value) => value + 1));
	}

	setScene(scene: string): void {
		this.editorScene.set(scene);
		this.screenshot.set('');
		this.screenshotError.set('');
		this.obs.scene(scene).subscribe(() => this.refresh.update((v) => v + 1));
		this.loadEditor();
		this.loadScreenshot();
	}

	toggleMute(input: string): void {
		this.obs.mute(input).subscribe(() => this.refresh.update((v) => v + 1));
	}

	addAutoScene(): void {
		this.autoScene.add(this.autoSceneGame(), this.autoSceneTarget());
		this.autoSceneGame.set('');
		this.autoSceneTarget.set('');
	}

	selectEditorScene(scene: string): void {
		this.editorScene.set(scene);
		this.selectedItemId.set(null);
		this.screenshot.set('');
		this.screenshotError.set('');
		this.loadEditor();
		this.loadScreenshot();
	}

	switchToScene(scene: string): void {
		if (!scene || !this.obsStatus()?.connected) {
			this.editorError.set('OBS не подключён: сначала подключите WebSocket');
			return;
		}
		this.editorError.set('');
		this.obs.scene(scene).subscribe({
			next: () => {
				this.editorScene.set(scene);
				this.screenshot.set('');
				this.screenshotError.set('');
				this.refresh.update((value) => value + 1);
				this.loadEditor();
				this.loadScreenshot();
			},
			error: (error) => this.editorError.set(this.errorText(error, 'OBS не переключил сцену')),
		});
	}

	onCanvasClick(event: MouseEvent): void {
		this.closeContextMenu();
		if (Date.now() - this.lastCanvasDropAt < 350) {
			return;
		}
		if (this.sourceToAdd()) {
			this.addSourceAt(event.clientX, event.clientY);
		}
	}

	loadEditor(): void {
		if (this.drag || this.editorBusy || !this.pageVisible) {
			return;
		}
		const scene = this.editorScene() || this.obsStatus()?.currentScene || '';

		if (!this.obsStatus()?.connected) {
			this.editorError.set('OBS не подключён: сначала подключите WebSocket');
			return;
		}
		if (!scene) {
			this.editorError.set('Не выбрана сцена OBS');
			return;
		}
		if (!this.editorScene()) {
			this.editorScene.set(scene);
		}
		this.editorBusy = true;
		this.obs.sceneItems(scene).pipe(finalize(() => (this.editorBusy = false))).subscribe({
			next: (snapshot) => {
				const currentScene = this.editorScene() || this.obsStatus()?.currentScene || '';

				if (scene !== currentScene) {
					return;
				}
				this.editor.set(snapshot);
				this.editorError.set('');
				if (this.selectedItemId() == null && snapshot.items.length) {
					this.selectedItemId.set(snapshot.items[0]?.id ?? null);
				}
			},
			error: (error) => this.editorError.set(this.errorText(error, 'Не удалось загрузить сцену')),
		});
	}

	loadScreenshot(): void {
		const scene = this.editorScene() || this.obsStatus()?.currentScene || '';

		if (
			!this.screenshotEnabled() ||
			!scene ||
			!this.obsStatus()?.connected ||
			this.screenshotBusy ||
			!this.pageVisible ||
			this.drag ||
			this.sourceDrag ||
			this.orderDrag ||
			this.contextMenu()
		) {
			return;
		}
		this.screenshotBusy = true;
		this.obs.sceneScreenshot(scene).pipe(finalize(() => (this.screenshotBusy = false))).subscribe({
			next: (image) => {
				const currentScene = this.editorScene() || this.obsStatus()?.currentScene || '';

				if (scene !== currentScene) {
					return;
				}
				this.screenshot.set(image);
				this.screenshotError.set('');
			},
			error: (error) =>
				this.screenshotError.set(this.errorText(error, 'OBS не отдаёт превью сцены')),
		});
	}

	selectItem(item: ObsSceneItem): void {
		this.selectedItemId.set(item.id);
	}

	itemStyle(item: ObsSceneItem): Record<string, string | number> {
		const video = this.editor()?.video;
		const baseWidth = video?.baseWidth || 1920;
		const baseHeight = video?.baseHeight || 1080;
		const transform = item.transform;
		const x = transform.positionX ?? 0;
		const y = transform.positionY ?? 0;
		const width = transform.width || transform.sourceWidth || baseWidth / 4;
		const height = transform.height || transform.sourceHeight || baseHeight / 4;

		return {
			left: `${(x / baseWidth) * 100}%`,
			top: `${(y / baseHeight) * 100}%`,
			width: `${(width / baseWidth) * 100}%`,
			height: `${(height / baseHeight) * 100}%`,
			transform: `rotate(${transform.rotation ?? 0}deg)`,
			zIndex: item.index,
		};
	}

	openContextMenu(event: MouseEvent, item?: ObsSceneItem): void {
		event.preventDefault();
		event.stopPropagation();
		const canvas = this.editorCanvas()?.nativeElement;

		if (!canvas) {
			return;
		}
		if (item) {
			this.selectItem(item);
		}
		const rect = canvas.getBoundingClientRect();
		this.contextMenu.set({
			x: Math.min(event.clientX - rect.left, rect.width - 220),
			y: Math.min(event.clientY - rect.top, rect.height - 260),
		});
	}

	closeContextMenu(): void {
		this.contextMenu.set(null);
	}

	contextToggle(item: ObsSceneItem, field: 'enabled' | 'locked'): void {
		this.toggleItem(item, field);
		this.closeContextMenu();
	}

	openSourceSettings(item: ObsSceneItem): void {
		this.closeContextMenu();
		this.settingsInput.set(item.sourceName);
		this.settingsKind.set('');
		this.settingsValues.set({});
		this.settingsError.set('');
		this.settingsOpen.set(true);
		this.settingsLoading.set(true);
		this.obs.inputSettings(item.sourceName).subscribe({
			next: (data) => {
				const settings = (data as { inputSettings?: Record<string, unknown> }).inputSettings ?? {};
				this.settingsKind.set(String((data as { inputKind?: string }).inputKind ?? ''));
				this.settingsValues.set(settings);
				this.settingsLoading.set(false);
			},
			error: (error) => {
				this.settingsError.set(this.errorText(error, 'OBS не отдал настройки источника'));
				this.settingsLoading.set(false);
			},
		});
	}

	closeSourceSettings(): void {
		this.settingsOpen.set(false);
		this.settingsError.set('');
	}

	reloadSourceSettings(): void {
		this.settingsOpen.set(false);
		const item = this.editor()?.items.find((candidate) => candidate.sourceName === this.settingsInput());

		if (item) {
			this.openSourceSettings(item);
		}
	}

	settingType(value: unknown): 'boolean' | 'number' | 'string' | 'json' {
		if (typeof value === 'boolean') return 'boolean';
		if (typeof value === 'number') return 'number';
		if (typeof value === 'string') return 'string';

		return 'json';
	}

	settingJson(value: unknown): string {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}

	updateSetting(key: string, value: unknown): void {
		this.settingsValues.update((current) => ({ ...current, [key]: value }));
	}

	updateNumberSetting(key: string, event: Event): void {
		this.updateSetting(key, Number((event.target as HTMLInputElement).value));
	}

	updateJsonSetting(key: string, event: Event): void {
		const value = (event.target as HTMLTextAreaElement).value;

		try {
			this.updateSetting(key, JSON.parse(value));
			this.settingsError.set('');
		} catch {
			this.settingsError.set(`Поле ${key}: некорректный JSON`);
		}
	}

	saveSourceSettings(): void {
		if (this.settingsSaving()) {
			return;
		}
		this.settingsSaving.set(true);
		this.settingsError.set('');
		this.obs.setInputSettings(this.settingsInput(), this.settingsValues()).subscribe({
			next: () => {
				this.settingsSaving.set(false);
				this.settingsOpen.set(false);
				this.loadEditor();
				this.loadScreenshot();
			},
			error: (error) => {
				this.settingsSaving.set(false);
				this.settingsError.set(this.errorText(error, 'OBS не сохранил настройки источника'));
			},
		});
	}

	openNativeSettings(input: string): void {
		this.obs.openInputProperties(input).subscribe({
			error: (error) => this.settingsError.set(this.errorText(error, 'OBS не открыл настройки источника')),
		});
	}

	openSourceProperties(item: ObsSceneItem): void {
		this.obs.openInputProperties(item.sourceName).subscribe({
			error: (error) =>
				this.editorError.set(this.errorText(error, 'OBS не открыл настройки источника')),
		});
		this.closeContextMenu();
	}

	contextRemove(item: ObsSceneItem): void {
		this.selectedItemId.set(item.id);
		this.removeSelectedItem();
		this.closeContextMenu();
	}

	contextMove(item: ObsSceneItem, delta: number): void {
		this.moveItem(item, delta);
		this.closeContextMenu();
	}

	startItemDrag(event: PointerEvent, item: ObsSceneItem, mode: 'move' | 'resize'): void {
		if (event.button !== 0 || item.locked) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		this.selectItem(item);
		this.draggingItemId.set(item.id);
		const canvas = this.editorCanvas()?.nativeElement;
		const video = this.editor()?.video;

		if (!canvas || !video) {
			return;
		}
		const rect = canvas.getBoundingClientRect();
		this.drag = {
			id: item.id,
			scene: this.editorScene(),
			mode,
			startX: event.clientX,
			startY: event.clientY,
			x: item.transform.positionX ?? 0,
			y: item.transform.positionY ?? 0,
			width: item.transform.width ?? item.transform.sourceWidth ?? 0,
			height: item.transform.height ?? item.transform.sourceHeight ?? 0,
			rotation: item.transform.rotation ?? 0,
			scaleX: video.baseWidth / rect.width,
			scaleY: video.baseHeight / rect.height,
		};

		const move = (pointer: PointerEvent): void => this.onItemDrag(pointer);
		const up = (): void => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			this.dragCleanup = null;
			this.commitItemDrag();
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up, { once: true });
		this.dragCleanup = up;
	}

	private onItemDrag(event: PointerEvent): void {
		const drag = this.drag;
		const snapshot = this.editor();

		if (!drag || !snapshot) {
			return;
		}
		const dx = (event.clientX - drag.startX) * drag.scaleX;
		const dy = (event.clientY - drag.startY) * drag.scaleY;
		const x = drag.mode === 'move' ? drag.x + dx : drag.x;
		const y = drag.mode === 'move' ? drag.y + dy : drag.y;
		const width = drag.mode === 'resize' ? Math.max(8, drag.width + dx) : drag.width;
		const height = drag.mode === 'resize' ? Math.max(8, drag.height + dy) : drag.height;

		this.editor.set({
			...snapshot,
			items: snapshot.items.map((item) => {
				if (item.id !== drag.id) {
					return item;
				}

				return {
					...item,
					transform: {
						...item.transform,
						positionX: x,
						positionY: y,
						width,
						height,
					},
				};
			}),
		});
	}

	private commitItemDrag(): void {
		const drag = this.drag;
		const item = this.editor()?.items.find((candidate) => candidate.id === drag?.id);

		this.drag = null;
		this.draggingItemId.set(null);
		if (!drag || !item) {
			return;
		}
		this.settlingItemId.set(drag.id);
		setTimeout(() => {
			if (this.settlingItemId() === drag.id) {
				this.settlingItemId.set(null);
			}
		}, 280);
		let transform: ObsTransform;

		if (drag.mode === 'move') {
			transform = {
				positionX: item.transform.positionX ?? 0,
				positionY: item.transform.positionY ?? 0,
			};
		} else {
			const sourceWidth = item.transform.sourceWidth || 1;
			const sourceHeight = item.transform.sourceHeight || 1;
			transform = {
				scaleX: (item.transform.width || sourceWidth) / sourceWidth,
				scaleY: (item.transform.height || sourceHeight) / sourceHeight,
			};
		}

		this.obs.updateSceneItemTransform(drag.scene, drag.id, transform).subscribe({
			next: () => this.loadEditor(),
			error: (error) =>
				this.editorError.set(this.errorText(error, 'OBS не применил трансформацию источника')),
		});
	}

	updateItemNumber(item: ObsSceneItem, field: keyof ObsTransform, event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);
		const scene = this.editorScene();
		const amount = Number.isFinite(value) ? value : 0;
		const transform: ObsTransform = {};

		if (field === 'width') {
			transform.scaleX = amount / (item.transform.sourceWidth || amount || 1);
		} else if (field === 'height') {
			transform.scaleY = amount / (item.transform.sourceHeight || amount || 1);
		} else {
			(transform as Record<string, number>)[field] = amount;
		}

		this.editor.update((snapshot) => {
			if (!snapshot) {
				return snapshot;
			}

			return {
				...snapshot,
				items: snapshot.items.map((candidate) =>
					candidate.id === item.id
						? {
								...candidate,
								transform: {
									...candidate.transform,
									...(field === 'width' || field === 'height' ? { [field]: amount } : transform),
								},
							}
						: candidate,
				),
			};
		});
		this.obs.updateSceneItemTransform(scene, item.id, transform).subscribe({
			error: (error) =>
				this.editorError.set(this.errorText(error, 'OBS не применил трансформацию источника')),
		});
	}

	toggleItem(item: ObsSceneItem, field: 'enabled' | 'locked'): void {
		const value = !item[field];
		const request =
			field === 'enabled'
				? this.obs.setSceneItemEnabled(this.editorScene(), item.id, value)
				: this.obs.setSceneItemLocked(this.editorScene(), item.id, value);

		request.subscribe({ next: () => this.loadEditor() });
	}

	removeSelectedItem(): void {
		const item = this.editor()?.items.find((candidate) => candidate.id === this.selectedItemId());

		if (!item) {
			return;
		}
		this.obs.removeSceneItem(this.editorScene(), item.id).subscribe({
			next: () => {
				this.selectedItemId.set(null);
				this.loadEditor();
			},
		});
	}

	scrollToEditor(): void {
		this.editorCard()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	startItemOrderDrag(event: PointerEvent, item: ObsSceneItem): void {
		if (event.button !== 0) {
			return;
		}
		this.orderDrag = { id: item.id, startY: event.clientY, moved: false };

		const move = (pointer: PointerEvent): void => {
			if (this.orderDrag && Math.abs(pointer.clientY - this.orderDrag.startY) > 5) {
				this.orderDrag.moved = true;
				this.dragGhost.set({ x: pointer.clientX, y: pointer.clientY, label: item.sourceName });
				this.orderTargetId.set(this.sourceItemAt(pointer.clientX, pointer.clientY));
				pointer.preventDefault();
			}
		};
		const up = (pointer: PointerEvent): void => {
			const drag = this.orderDrag;

			this.orderDrag = null;
			this.dragGhost.set(null);
			this.orderTargetId.set(null);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			if (!drag?.moved) {
				return;
			}
			const targetId = this.sourceItemAt(pointer.clientX, pointer.clientY);

			if (targetId && targetId !== drag.id) {
				this.reorderSceneItem(drag.id, targetId);
			}
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up, { once: true });
	}

	private sourceItemAt(x: number, y: number): number | null {
		const target = document
			.elementFromPoint(x, y)
			?.closest<HTMLElement>('[data-scene-item-id]');
		const id = Number(target?.dataset['sceneItemId']);

		return Number.isFinite(id) && id > 0 ? id : null;
	}

	reorderSceneItem(id: number, targetId: number): void {
		const item = this.editor()?.items.find((candidate) => candidate.id === id);
		const target = this.editor()?.items.find((candidate) => candidate.id === targetId);

		if (!item || !target) {
			return;
		}
		this.obs.setSceneItemIndex(this.editorScene(), item.id, target.index).subscribe({
			next: () => this.loadEditor(),
			error: (error) => this.editorError.set(this.errorText(error, 'OBS не изменил порядок источников')),
		});
	}

	startSourcePointerDrag(event: PointerEvent, source: string): void {
		if (event.button !== 0) {
			return;
		}
		this.sourceDrag = {
			source,
			startX: event.clientX,
			startY: event.clientY,
			moved: false,
		};

		const move = (pointer: PointerEvent): void => {
			const drag = this.sourceDrag;

			if (!drag) {
				return;
			}
			if (Math.hypot(pointer.clientX - drag.startX, pointer.clientY - drag.startY) > 6) {
				drag.moved = true;
				this.sourceDragActive.set(true);
				this.dragGhost.set({ x: pointer.clientX, y: pointer.clientY, label: source });
				pointer.preventDefault();
			}
		};
		const up = (pointer: PointerEvent): void => {
			const drag = this.sourceDrag;

			this.sourceDrag = null;
			this.dragGhost.set(null);
			this.sourceDragActive.set(false);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			if (drag?.moved) {
				this.lastCanvasDropAt = Date.now();
				this.addSourceAt(pointer.clientX, pointer.clientY, drag.source);
			}
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up, { once: true });
	}

	allowSourceDrop(event: DragEvent): void {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	dropSourceOnCanvas(event: DragEvent): void {
		event.preventDefault();
		const source = event.dataTransfer?.getData('text/plain') || this.sourceToAdd();

		this.addSourceAt(event.clientX, event.clientY, source);
	}

	private addSourceAt(clientX: number, clientY: number, source = this.sourceToAdd()): void {
		const scene = this.editorScene();
		const canvas = this.editorCanvas()?.nativeElement;
		const video = this.editor()?.video;

		if (!source || !scene || !canvas || !video) {
			this.editorError.set('Выберите источник и сцену OBS');
			return;
		}
		if (!this.obsStatus()?.connected) {
			this.editorError.set('OBS не подключён: сначала подключите WebSocket');
			return;
		}
		const rect = canvas.getBoundingClientRect();
		const x = Math.max(0, Math.min(video.baseWidth, ((clientX - rect.left) / rect.width) * video.baseWidth));
		const y = Math.max(
			0,
			Math.min(video.baseHeight, ((clientY - rect.top) / rect.height) * video.baseHeight),
		);

		this.obs
			.createSceneItem(scene, source)
			.pipe(
				switchMap((result) => {
					const id = Number((result as { sceneItemId?: number })?.sceneItemId);
					if (!Number.isFinite(id) || id <= 0) {
						return of(null);
					}
					return this.obs.updateSceneItemTransform(scene, id, {
						positionX: Math.round(x),
						positionY: Math.round(y),
					});
				}),
			)
			.subscribe({
				next: () => {
					this.sourceToAdd.set('');
					this.loadEditor();
				},
				error: (error) => this.editorError.set(this.errorText(error, 'Не удалось добавить источник')),
			});
	}

	addSourceToScene(): void {
		const source = this.sourceToAdd();

		if (!source) {
			return;
		}
		this.obs.createSceneItem(this.editorScene(), source).subscribe({
			next: () => {
				this.sourceToAdd.set('');
				this.loadEditor();
			},
			error: (error) => this.editorError.set(this.errorText(error, 'OBS не добавил источник')),
		});
	}

	moveItem(item: ObsSceneItem, delta: number): void {
		const items = this.editor()?.items ?? [];
		const index = items.findIndex((candidate) => candidate.id === item.id);
		const target = Math.max(0, Math.min(items.length - 1, index + delta));

		if (index < 0 || target === index) {
			return;
		}
		this.obs.setSceneItemIndex(this.editorScene(), item.id, target).subscribe({
			next: () => this.loadEditor(),
		});
	}

	output(output: string, action: string): void {
		this.obs.output(output, action).subscribe(() => this.refresh.update((v) => v + 1));
	}

	saveStream(): void {
		this.stream.update(this.title().trim(), this.gameQuery().trim()).subscribe({
			next: () => this.flash(this.streamSaved),
			error: () => undefined,
		});
	}

	toggleShield(event: Event): void {
		this.stream.shield(this.check(event)).subscribe(() => this.refresh.update((v) => v + 1));
	}

	adBreak(length: number): void {
		this.stream.commercial(length).subscribe();
	}

	saveNotify(): void {
		const current = this.notifySettings();

		if (!current) {
			return;
		}

		this.notify
			.save({
				...current,
				discordWebhook: this.discordWebhook(),
				telegramToken: this.telegramToken(),
				telegramChatId: this.telegramChatId(),
				digest: this.notifySettings()?.digest ?? true,
			})
			.subscribe(() => this.flash(this.notifySaved));
	}

	toggleNotify(field: keyof NotifySettings, event: Event): void {
		const current = this.notifySettings();

		if (!current) {
			return;
		}

		this.notify
			.save({
				...current,
				discordWebhook: this.discordWebhook() || current.discordWebhook,
				telegramToken: this.telegramToken() || current.telegramToken,
				telegramChatId: this.telegramChatId() || current.telegramChatId,
				digest: current.digest,
				[field]: this.check(event),
			})
			.subscribe(() => this.refresh.update((v) => v + 1));
	}

	testNotify(): void {
		this.notify.test().subscribe();
	}

	private applyNotify(settings: NotifySettings): void {
		this.discordWebhook.set(settings.discordWebhook);
		this.telegramToken.set(settings.telegramToken);
		this.telegramChatId.set(settings.telegramChatId);
	}

	private flash(flag: { set: (value: boolean) => void }): void {
		flag.set(true);

		timer(1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => flag.set(false));
	}
}
