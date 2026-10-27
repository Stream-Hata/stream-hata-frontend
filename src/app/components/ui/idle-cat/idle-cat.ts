import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-idle-cat',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '[class.talking]': 'talking()' },
	template: `
		<svg viewBox="0 0 240 260" role="img" aria-label="Кот">
			<defs>
				<linearGradient id="cat-fur" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#ffc078" />
					<stop offset="0.55" stop-color="#f09a4b" />
					<stop offset="1" stop-color="#c96c32" />
				</linearGradient>
				<linearGradient id="cat-cream" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#fff4dc" />
					<stop offset="1" stop-color="#f3d7aa" />
				</linearGradient>
				<linearGradient id="cat-ear" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#ffb4a8" />
					<stop offset="1" stop-color="#d96c72" />
				</linearGradient>
				<radialGradient id="cat-eye" cx="45%" cy="35%" r="70%">
					<stop offset="0" stop-color="#b8ff7a" />
					<stop offset="0.5" stop-color="#58c86b" />
					<stop offset="1" stop-color="#1d5c3a" />
				</radialGradient>
				<filter id="cat-shadow" x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation="8" />
				</filter>
			</defs>

			<ellipse class="floor-shadow" cx="120" cy="243" rx="72" ry="12" filter="url(#cat-shadow)" />

			<g class="cat" [class.old]="stage() === 3">
				<g class="tail">
					<path d="M68 204c-38 10-54-14-44-43 7-20 28-24 36-10 6 11-8 19-16 13-9-6-4 21 10 24 8 1 14-1 19-5" />
				</g>

				<g class="body">
					<path class="fur" d="M120 112c-37 0-55 40-53 88 2 30 24 46 53 46s51-16 53-46c2-48-16-88-53-88z" />
					<path class="chest" d="M120 128c-22 0-34 24-33 51 1 22 14 37 33 37s32-15 33-37c1-27-11-51-33-51z" />
					<path class="stripe" d="M83 152c11 4 15 12 14 23M157 152c-11 4-15 12-14 23M86 181c9 3 12 9 11 17M154 181c-9 3-12 9-11 17" />
					<path class="paw" d="M91 221c-9 0-15 6-15 14 0 7 6 11 15 11h12c7 0 11-4 11-10 0-9-9-15-23-15z" />
					<path class="paw" d="M149 221c9 0 15 6 15 14 0 7-6 11-15 11h-12c-7 0-11-4-11-10 0-9 9-15 23-15z" />
					<path class="paw-line" d="M84 237h22M134 237h22M93 232v9M147 232v9" />
				</g>

				<g class="head">
					<path class="ear" d="M74 57 72 17c0-4 4-6 7-3l30 25z" />
					<path class="ear" d="M166 57 168 17c0-4-4-6-7-3l-30 25z" />
					<path class="ear-inner" d="M81 50 80 28l20 17zM159 50l1-22-20 17z" />
					<ellipse class="face" cx="120" cy="78" rx="55" ry="51" />
					<path class="forehead-stripe" d="M120 30v20M104 33l5 18M136 33l-5 18" />
					<g class="eyes">
						<ellipse class="eye" cx="97" cy="72" rx="12" ry="9" />
						<ellipse class="eye" cx="143" cy="72" rx="12" ry="9" />
						<ellipse class="pupil" cx="97" cy="72" rx="3.5" ry="7" />
						<ellipse class="pupil" cx="143" cy="72" rx="3.5" ry="7" />
						<circle class="shine" cx="93" cy="68" r="2.5" />
						<circle class="shine" cx="139" cy="68" r="2.5" />
					</g>
					<g class="glasses" [style.display]="stage() === 3 ? 'inline' : 'none'">
						<circle cx="97" cy="72" r="18" />
						<circle cx="143" cy="72" r="18" />
						<path d="M115 72h10M79 68l-12-4M161 68l12-4" />
					</g>
					<ellipse class="muzzle" cx="120" cy="95" rx="28" ry="19" />
					<path class="nose" d="m120 88 7 5-7 5-7-5z" />
					<g class="mouth">
						<path class="mouth-line" d="M120 98v6M120 104c-5 5-11 5-15 0M120 104c5 5 11 5 15 0" />
						<path class="mouth-lower" d="M108 108c4 7 8 8 12 1 4 7 8 6 12-1" />
					</g>
					<path class="whisker" d="M91 92 55 86M92 99 56 101M149 92l36-6M148 99l36 2" />
					<path class="cheek" d="M78 86c8 9 18 12 28 11M162 86c-8 9-18 12-28 11" />
				</g>

				<g class="laptop" [style.display]="stage() >= 2 ? 'inline' : 'none'">
					<path class="laptop-base" d="M74 208h92l10 16H64z" />
					<rect class="laptop-screen" x="86" y="166" width="68" height="44" rx="5" />
					<rect class="laptop-display" x="92" y="172" width="56" height="31" rx="2" />
					<path class="laptop-glow" d="M92 172h56v31H92z" />
					<path class="keyboard" d="M82 211h76M87 216h66" />
				</g>

				<g class="cane" [style.display]="stage() === 3 ? 'inline' : 'none'">
					<path d="M177 191c13 0 20 9 20 22v29" />
					<path d="M191 218c-10 0-16 5-16 12" />
				</g>
			</g>
		</svg>
	`,
	styles: `
		:host {
			display: block;
			width: 300px;
			max-width: 68vw;
			height: auto;
			filter: drop-shadow(0 18px 28px rgb(0 0 0 / 38%));
		}

		svg {
			display: block;
			width: 100%;
			height: auto;
			overflow: visible;
		}

		.floor-shadow {
			fill: rgb(0 0 0 / 35%);
		}

		.cat {
			transform-origin: 120px 238px;
			animation: cat-breathe 2.4s ease-in-out infinite;
		}

		.fur,
		.face,
		.ear {
			fill: url(#cat-fur);
			stroke: #3a1f2e;
			stroke-width: 3;
			stroke-linejoin: round;
		}

		.ear {
			stroke-width: 4;
		}

		.ear-inner {
			fill: url(#cat-ear);
			stroke: #3a1f2e;
			stroke-width: 2;
		}

		.chest,
		.muzzle {
			fill: url(#cat-cream);
			stroke: #3a1f2e;
			stroke-width: 2.5;
		}

		.stripe,
		.forehead-stripe {
			fill: none;
			stroke: #b9602e;
			stroke-width: 5;
			stroke-linecap: round;
			opacity: 0.75;
		}

		.forehead-stripe {
			stroke-width: 4;
		}

		.tail path {
			fill: none;
			stroke: url(#cat-fur);
			stroke-width: 22;
			stroke-linecap: round;
			filter: drop-shadow(0 4px 3px rgb(0 0 0 / 20%));
		}

		.tail {
			transform-origin: 70px 200px;
			animation: tail-sway 2.8s ease-in-out infinite;
		}

		.paw {
			fill: url(#cat-cream);
			stroke: #3a1f2e;
			stroke-width: 3;
		}

		.paw-line {
			fill: none;
			stroke: #3a1f2e;
			stroke-width: 2;
			stroke-linecap: round;
		}

		.eye {
			fill: url(#cat-eye);
			stroke: #3a1f2e;
			stroke-width: 2;
		}

		.pupil {
			fill: #14251c;
		}

		.shine {
			fill: #fff;
			opacity: 0.9;
		}

		.eyes {
			transform-box: fill-box;
			transform-origin: center;
			animation: blink 5.5s ease-in-out infinite;
		}

		.nose {
			fill: #e77982;
			stroke: #3a1f2e;
			stroke-width: 1.5;
		}

		.mouth-line,
		.mouth-lower {
			fill: none;
			stroke: #3a1f2e;
			stroke-width: 2.2;
			stroke-linecap: round;
		}

		.mouth-lower {
			transform-box: fill-box;
			transform-origin: top center;
			animation: mouth 1.8s ease-in-out infinite;
		}

		.whisker,
		.cheek {
			fill: none;
			stroke: #3a1f2e;
			stroke-width: 1.8;
			stroke-linecap: round;
			opacity: 0.8;
		}

		.head {
			transform-origin: 120px 100px;
			animation: head-tilt 4.5s ease-in-out infinite;
		}

		.ear {
			animation: ear-twitch 4.5s ease-in-out infinite;
			transform-box: fill-box;
			transform-origin: bottom center;
		}

		.laptop-base {
			fill: #2a173d;
			stroke: #160b20;
			stroke-width: 3;
		}

		.laptop-screen {
			fill: #1b1028;
			stroke: #160b20;
			stroke-width: 3;
		}

		.laptop-display {
			fill: var(--accent-primary);
			opacity: 0.85;
		}

		.laptop-glow {
			fill: url(#cat-cream);
			opacity: 0.18;
		}

		.keyboard {
			fill: none;
			stroke: #8f7aa6;
			stroke-width: 1.5;
			stroke-linecap: round;
		}

		.cane path {
			fill: none;
			stroke: #c99a63;
			stroke-width: 7;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		.glasses circle,
		.glasses path {
			fill: none;
			stroke: #3a1f2e;
			stroke-width: 2.5;
		}

		.old .fur,
		.old .face,
		.old .ear {
			fill: #b8aec6;
		}

		.old .chest,
		.old .muzzle,
		.old .paw {
			fill: #e6dfea;
		}

		.old .tail path {
			stroke: #b8aec6;
		}

		.talking .mouth-lower {
			animation-duration: 0.26s;
		}

		.talking .head {
			animation: head-talk 0.45s ease-in-out infinite alternate;
		}

		.talking .ear {
			animation: ear-twitch 0.7s ease-in-out infinite;
		}

		@keyframes cat-breathe {
			50% {
				transform: translateY(-2px) scale(1.008);
			}
		}

		@keyframes tail-sway {
			50% {
				transform: rotate(-7deg);
			}
		}

		@keyframes head-tilt {
			50% {
				transform: rotate(1.5deg);
			}
		}

		@keyframes head-talk {
			to {
				transform: translateY(-1px) rotate(1deg);
			}
		}

		@keyframes ear-twitch {
			45%,
			55% {
				transform: rotate(-4deg);
			}
		}

		@keyframes blink {
			0%,
			44%,
			48%,
			100% {
				transform: scaleY(1);
			}
			46% {
				transform: scaleY(0.08);
			}
		}

		@keyframes mouth {
			0%,
			100% {
				transform: scaleY(0.3);
			}
			50% {
				transform: scaleY(1);
			}
		}
	`,
})
export class IdleCat {
	readonly stage = input(1);
	readonly talking = input(false);
}
