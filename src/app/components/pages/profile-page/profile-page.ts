import type {
	SteamAchievement,
	SteamInventoryItem,
	SteamLibraryGame,
} from '@shared/services/steam.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoleService } from '@shared/services/role.service';
import { SteamService } from '@shared/services/steam.service';
import { ProfileDataService } from '@shared/services/profile-data.service';
import { TwitchService } from '@shared/services/twitch.service';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	TuiLink,
	TuiSelectLike,
	TuiTextfield,
} from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiDataListWrapper, TuiSegmented } from '@taiga-ui/kit';
import { catchError, map, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiLink,
		TuiSegmented,
		TuiSelectLike,
		TuiTextfield,
	],
	selector: 'app-profile-page',
	styleUrl: './profile-page.scss',
	templateUrl: './profile-page.html',
})
export default class ProfilePage {
	private readonly twitchService = inject(TwitchService);
	private readonly rolesService = inject(RoleService);
	private readonly steamService = inject(SteamService);
	private readonly profileData = inject(ProfileDataService);

	readonly twitch = this.profileData.twitch;
	readonly steam = this.profileData.steam;
	readonly profileLoading = this.profileData.loading;

	readonly connected = computed(() => Boolean(this.twitch()?.valid));
	readonly name = computed(() => this.twitch()?.user?.displayName ?? 'Канал не подключён');
	readonly login = computed(() => this.twitch()?.user?.username ?? '—');
	readonly initials = computed(() => this.name().slice(0, 2).toUpperCase());
	readonly followers = computed(() => this.twitch()?.state?.followers ?? 0);
	readonly subscribers = computed(() => this.twitch()?.state?.subscribers ?? 0);
	readonly chatters = computed(() => this.twitch()?.state?.chatters ?? 0);
	readonly online = computed(() => Boolean(this.twitch()?.steam?.online));
	readonly viewers = computed(() => Number(this.twitch()?.steam?.viewerCount ?? '') || 0);
	readonly twitchId = computed(() => this.twitch()?.user?.twitchId || '—');
	readonly section = signal<'info' | 'games'>('info');
	readonly tab = signal<'games' | 'inventory' | 'achievements'>('games');
	readonly gameQuery = new FormControl('', { nonNullable: true });
	readonly gamePage = signal(1);
	readonly gamePageSize = 24;
	readonly inventorySort = signal<'name' | 'amount' | 'type'>('name');
	readonly achievementGame = signal('all');
	readonly steamLibraryLoading = signal(true);
	readonly steamLibrary = computed(() => this.steam()?.items ?? []);

	readonly steamInventory = toSignal(
		timer(0, 60_000).pipe(
			switchMap(() =>
				this.steamService.inventory().pipe(
					map((response) => response.items),
					catchError(() => of([] as SteamInventoryItem[])),
				),
			),
		),
		{ initialValue: [] as SteamInventoryItem[] },
	);

	readonly steamAchievements = signal<SteamAchievement[]>([]);
	readonly achievementsLoading = signal(false);
	private achievementsRequested = false;

	constructor() {
		effect(() => {
			if (this.steam()) {
				this.steamLibraryLoading.set(false);
			}
		});

		effect(() => {
			if (this.tab() === 'achievements' && !this.achievementsRequested) {
				this.loadAchievements();
			}
		});
	}

	private loadAchievements(): void {
		this.achievementsRequested = true;
		this.achievementsLoading.set(true);
		this.steamService.achievements().subscribe({
			next: (response) => this.steamAchievements.set(response.items),
			error: () => this.steamAchievements.set([]),
			complete: () => this.achievementsLoading.set(false),
		});
	}

	readonly achievementGames = computed(() => {
		const names = new Set(this.steamAchievements().map((item) => item.gameName));

		return ['all', ...names];
	});

	readonly achievementLabels = computed(() =>
		this.achievementGames().map((name) => (name === 'all' ? 'Все игры' : name)),
	);

	readonly achievementGameLabel = computed(() =>
		this.achievementGame() === 'all' ? 'Все игры' : this.achievementGame(),
	);

	readonly filteredAchievements = computed(() => {
		const selected = this.achievementGame();
		const items = this.steamAchievements();

		return selected === 'all' ? items : items.filter((item) => item.gameName === selected);
	});

	readonly achievedCount = computed(
		() => this.filteredAchievements().filter((item) => item.achieved).length,
	);

	readonly filteredGames = computed(() => {
		const query = this.gameQuery.value.trim().toLowerCase();
		const games = this.steamLibrary();

		return query ? games.filter((game) => game.name.toLowerCase().includes(query)) : games;
	});

	readonly gamePages = computed(() =>
		Math.max(1, Math.ceil(this.filteredGames().length / this.gamePageSize)),
	);

	readonly safeGamePage = computed(() => Math.min(this.gamePage(), this.gamePages()));
	readonly pagedGames = computed(() => {
		const page = this.safeGamePage();

		return this.filteredGames().slice((page - 1) * this.gamePageSize, page * this.gamePageSize);
	});

	readonly sortedInventory = computed(() => {
		const items = [...this.steamInventory()];
		const sort = this.inventorySort();

		return items.sort((left, right) => {
			if (sort === 'amount') return right.amount - left.amount;
			if (sort === 'type') return left.type.localeCompare(right.type);
			return left.name.localeCompare(right.name);
		});
	});

	readonly role = computed(() => {
		const labels: Record<string, string> = {
			owner: 'Владелец',
			admin: 'Админ',
			moderator: 'Модератор',
			vip: 'VIP',
			viewer: 'Зритель',
		};

		return labels[this.rolesService.role()];
	});

	readonly streamTitle = computed(() => this.twitch()?.steam?.title || '—');
	readonly streamGame = computed(() => this.twitch()?.steam?.gameName || '—');
	readonly streamStarted = computed(() => this.twitch()?.steam?.startedAt || '—');
	readonly streamLanguage = computed(() => this.twitch()?.steam?.language || '—');
	readonly streamTags = computed(() => this.twitch()?.steam?.tags || '');

	achievementDate(timestamp: number): string {
		return timestamp ? new Date(timestamp * 1000).toLocaleDateString('ru-RU') : '—';
	}

	setAchievementGame(label: string): void {
		this.achievementGame.set(label === 'Все игры' ? 'all' : label);
	}

	readonly steamGameCount = computed(() => this.steam()?.gameCount ?? this.steamLibrary().length);
	readonly steamGameCountLabel = computed(() => `${this.steamGameCount()} игр в библиотеке`);

	linkSteam(): void {
		this.steamService.link();
	}

	unlinkSteam(): void {
		this.steamService.unlink().subscribe(() => location.reload());
	}

	logout(): void {
		this.twitchService.disconnect().subscribe(() => location.assign('/login'));
	}
}
