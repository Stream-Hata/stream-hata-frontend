import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-idle-warrant',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '[class.talking]': 'talking()' },
	template: `
		<svg viewBox="0 0 240 300" role="img" aria-label="Прапорщик">
			<defs>
				<linearGradient id="w-uniform" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#7e9a68" /><stop offset="1" stop-color="#405b3b" />
				</linearGradient>
				<linearGradient id="w-skin" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#f6c9a4" /><stop offset="1" stop-color="#d99d76" />
				</linearGradient>
				<linearGradient id="w-cap" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#9bb27e" /><stop offset="1" stop-color="#526d49" />
				</linearGradient>
				<filter id="w-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8" /></filter>
			</defs>
			<ellipse class="floor-shadow" cx="120" cy="282" rx="68" ry="11" filter="url(#w-shadow)" />
			<g class="warrant" [class.old]="stage() === 3">
				<g class="boot boot-left"><path d="M78 244h30v30H78c-8 0-13-5-13-12 0-10 5-18 13-18z" /></g>
				<g class="boot boot-right"><path d="M132 244h30c8 0 13 8 13 18 0 7-5 12-13 12h-30z" /></g>
				<path class="trousers" d="M80 205h80l8 49H72z" />
				<path class="belt" d="M76 199h88v14H76z" />
				<rect class="buckle" x="113" y="198" width="14" height="16" rx="3" />
				<path class="tunic" d="M82 118h76c13 0 22 12 22 28v60H60v-60c0-16 9-28 22-28z" />
				<path class="collar" d="M96 118l24 23 24-23 9 10-33 31-33-31z" />
				<path class="tie" d="M116 139h8l5 31-9 10-9-10z" />
				<path class="epaulette" d="M67 125h25v9H67zM148 125h25v9h-25z" />
				<g class="head">
					<path class="neck" d="M104 105h32v22h-32z" />
					<ellipse class="face" cx="120" cy="83" rx="43" ry="45" />
					<path class="ear" d="M82 73c-5-9-5-19 2-25l14 16zM158 73c5-9 5-19-2-25l-14 16z" />
					<path class="cap" d="M76 57c4-20 20-31 44-31s40 11 44 31l-7 12H83z" />
					<path class="cap-band" d="M83 61h74v10H83z" />
					<path class="visor" d="M78 70c13-6 27-8 42-8s29 2 42 8l-7 8c-11-4-22-6-35-6s-24 2-35 6z" />
					<path class="cap-star" d="m120 37 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z" />
					<g class="eyes"><ellipse class="eye" cx="102" cy="84" rx="5" ry="4" /><ellipse class="eye" cx="138" cy="84" rx="5" ry="4" /></g>
					<path class="brow" d="M91 74c7-4 14-4 21 0M128 74c7-4 14-4 21 0" />
					<path class="nose" d="m120 91 5 4-5 4-5-4z" />
					<path class="mustache" d="M120 101c-8-5-17-4-22 3 8 1 15 4 22 8 7-4 14-7 22-8-5-7-14-8-22-3z" />
					<path class="mouth" d="M108 111c8 5 16 5 24 0" />
					<path class="wrinkle" d="M98 92c-4 3-5 7-3 11M142 92c4 3 5 7 3 11" />
				</g>
				<g class="wave-arm"><path class="sleeve" d="M62 137c-19 2-28 17-26 34" /><circle class="hand" cx="35" cy="173" r="13" /><path class="wave-line" d="M18 154c-5-8-6-16-3-24M12 165c-7-4-11-10-13-17" /></g>
				<path class="arm" d="M178 138c17 7 24 20 21 37" /><circle class="hand" cx="199" cy="177" r="12" />
				<g class="laptop" [style.display]="stage() >= 2 ? 'inline' : 'none'"><path class="laptop-base" d="M78 214h84l10 15H68z" /><rect class="laptop-screen" x="89" y="175" width="62" height="39" rx="4" /><rect class="laptop-display" x="95" y="181" width="50" height="27" rx="2" /><path class="keyboard" d="M84 218h72M89 223h62" /></g>
				<g class="cane" [style.display]="stage() === 3 ? 'inline' : 'none'"><path d="M200 180c12 0 18 9 18 21v58" /><path d="M212 205c-8 0-13 5-13 11" /></g>
			</g>
		</svg>
	`,
	styles: `
		:host { display: block; width: 300px; max-width: 68vw; height: auto; filter: drop-shadow(0 18px 28px rgb(0 0 0 / 38%)); }
		svg { display: block; width: 100%; height: auto; overflow: visible; }
		.floor-shadow { fill: rgb(0 0 0 / 35%); }
		.warrant { transform-origin: 120px 278px; animation: w-breathe 2.6s ease-in-out infinite; }
		.tunic { fill: url(#w-uniform); stroke: #263a26; stroke-width: 3; stroke-linejoin: round; }
		.cap { fill: url(#w-cap); stroke: #263a26; stroke-width: 3; }
		.trousers, .sleeve { fill: #536b4b; stroke: #263a26; stroke-width: 3; }
		.sleeve { fill: none; stroke-width: 20; stroke-linecap: round; }
		.boot path { fill: #2c2428; stroke: #1c171b; stroke-width: 3; stroke-linejoin: round; }
		.belt { fill: #2e2925; }
		.buckle { fill: #d5b05a; stroke: #6d5121; stroke-width: 2; }
		.collar { fill: #d6d1b4; stroke: #263a26; stroke-width: 2; }
		.tie { fill: #2f4430; }
		.epaulette { fill: #d5b05a; stroke: #6d5121; stroke-width: 2; }
		.face, .ear { fill: url(#w-skin); stroke: #4a2c24; stroke-width: 3; }
		.neck { fill: #d99d76; stroke: #4a2c24; stroke-width: 2; }
		.cap-band, .visor { fill: #33452e; stroke: #263a26; stroke-width: 2; }
		.cap-star { fill: #e4c363; stroke: #6d5121; stroke-width: 1.5; }
		.eye { fill: #2a1d22; }
		.brow, .wrinkle, .mouth { fill: none; stroke: #4a2c24; stroke-width: 2.5; stroke-linecap: round; }
		.nose { fill: #b76c59; stroke: #4a2c24; stroke-width: 1.5; }
		.mustache { fill: #594239; stroke: #4a2c24; stroke-width: 2; }
		.hand { fill: url(#w-skin); stroke: #4a2c24; stroke-width: 3; }
		.arm { fill: none; stroke: #536b4b; stroke-width: 18; stroke-linecap: round; }
		.wave-line { fill: none; stroke: var(--accent-primary); stroke-width: 4; stroke-linecap: round; opacity: .7; animation: w-lines 1.2s ease-in-out infinite; }
		.wave-arm { transform-box: fill-box; transform-origin: 62px 137px; animation: w-wave 1.2s ease-in-out infinite; }
		.eyes { transform-box: fill-box; transform-origin: center; animation: w-blink 5s ease-in-out infinite; }
		.laptop-base, .laptop-screen { fill: #2a173d; stroke: #160b20; stroke-width: 3; }
		.laptop-display { fill: var(--accent-primary); opacity: .85; }
		.keyboard { fill: none; stroke: #8f7aa6; stroke-width: 1.5; stroke-linecap: round; }
		.cane path { fill: none; stroke: #c99a63; stroke-width: 6; stroke-linecap: round; }
		.old .tunic, .old .cap { fill: #7b7a70; }
		.talking .mouth { animation: w-talk .35s ease-in-out infinite alternate; }
		@keyframes w-breathe { 50% { transform: translateY(-2px); } }
		@keyframes w-wave { 50% { transform: rotate(-12deg); } }
		@keyframes w-lines { 50% { opacity: .3; transform: translateX(-3px); } }
		@keyframes w-blink { 46% { transform: scaleY(.08); } }
		@keyframes w-talk { to { transform: translateY(2px); } }
	`,
})
export class IdleWarrant {
	readonly stage = input(1);
	readonly talking = input(false);
}
