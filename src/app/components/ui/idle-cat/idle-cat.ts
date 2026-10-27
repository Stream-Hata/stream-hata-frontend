import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-idle-cat',
	host: { '[class.talking]': 'talking()' },
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<svg viewBox="0 0 120 130" role="img" aria-label="Кот">
			<g class="cat" [class.old]="stage() === 3">
				<g class="tail">
					<path d="M38 84c-18 2-27-12-23-25 2-7 10-9 14-4 3 4-1 8-5 7-5-1-5 9 3 11 5 1 9 0 12-2z" />
				</g>
				<ellipse class="body" cx="61" cy="79" rx="25" ry="30" />
				<path class="stripe" d="M50 63c6 4 7 10 5 16M61 60c5 4 6 9 4 15" />
				<g class="leg leg-left"><path d="M47 101l-4 21h12l2-21z" /></g>
				<g class="leg leg-right"><path d="M68 101l3 21h12l-3-21z" /></g>
				<g class="arm arm-left"><path d="M44 76c-9 2-14 10-13 18" /></g>
				<g class="arm arm-right"><path d="M78 76c9 2 14 10 13 18" /></g>
				<g class="head">
					<path class="ear" d="M43 29 47 9l17 14z" />
					<path class="ear" d="M64 23 80 9l3 20z" />
					<circle cx="62" cy="39" r="22" />
					<circle class="eye" cx="54" cy="36" r="3" />
					<circle class="eye" cx="70" cy="36" r="3" />
					<g class="glasses" [style.display]="stage() === 3 ? 'inline' : 'none'">
						<circle cx="54" cy="36" r="7" />
						<circle cx="70" cy="36" r="7" />
						<path d="M61 36h2" />
					</g>
					<path class="nose" d="m59 44 3 2 3-2-3-2z" />
					<g class="mouth">
						<path class="mouth-upper" d="M60 47c2 2 4 2 6 0" />
						<path class="mouth-lower" d="M60 47c2 5 5 6 8 0" />
					</g>
					<path class="whisker" d="M42 42H30M43 47l-12 3M82 42h12M81 47l12 3" />
				</g>
				<g class="laptop" [style.display]="stage() >= 2 ? 'inline' : 'none'">
					<rect x="40" y="76" width="40" height="25" rx="4" />
					<rect class="screen" x="45" y="80" width="30" height="14" rx="2" />
					<path d="M38 101h44l5 5H33z" />
				</g>
				<g class="cane" [style.display]="stage() === 3 ? 'inline' : 'none'">
					<path d="M86 86c7 0 10 5 10 12v28" />
				</g>
			</g>
		</svg>
	`,
	styles: `
		:host {
			display: block;
			width: 104px;
			height: 112px;
			filter: drop-shadow(0 12px 18px rgb(0 0 0 / 35%));
		}

		svg {
			display: block;
			width: 100%;
			height: 100%;
			overflow: visible;
		}

		.body,
		.head circle:not(.eye),
		.ear,
		.leg path {
			fill: #f4a261;
			stroke: #2a173d;
			stroke-width: 2.5;
			stroke-linejoin: round;
		}

		.tail path,
		.arm path {
			fill: none;
			stroke: #f4a261;
			stroke-width: 8;
			stroke-linecap: round;
		}

		.tail {
			transform-origin: 38px 82px;
			animation: tail 1.5s ease-in-out infinite;
		}

		.cat {
			transform-origin: 60px 110px;
			animation: cat-bob 0.9s ease-in-out infinite;
		}

		.stripe {
			fill: none;
			stroke: #d97b3f;
			stroke-width: 2;
			stroke-linecap: round;
		}

		.leg,
		.arm {
			transform-box: fill-box;
			transform-origin: top center;
		}

		.leg-left,
		.arm-left {
			animation: limb-left 1.1s ease-in-out infinite;
		}

		.leg-right,
		.arm-right {
			animation: limb-right 1.1s ease-in-out infinite;
		}

		.eye,
		.nose {
			fill: #2a173d;
		}

		.mouth-upper,
		.mouth-lower {
			fill: none;
			stroke: #2a173d;
			stroke-width: 2;
			stroke-linecap: round;
		}

		.mouth-lower {
			transform-box: fill-box;
			transform-origin: top center;
			animation: mouth 1.2s ease-in-out infinite;
		}

		.whisker {
			fill: none;
			stroke: #2a173d;
			stroke-width: 1.5;
			stroke-linecap: round;
		}

		.laptop rect {
			fill: #241536;
			stroke: #2a173d;
			stroke-width: 2;
		}

		.laptop .screen {
			fill: var(--accent-primary);
			opacity: 0.7;
		}

		.cane path {
			fill: none;
			stroke: #c9a06a;
			stroke-width: 4;
			stroke-linecap: round;
		}

		.glasses circle,
		.glasses path {
			fill: none;
			stroke: #2a173d;
			stroke-width: 2;
		}

		.old .body,
		.old .head circle:not(.eye),
		.old .ear,
		.old .leg path {
			fill: #b9a8cf;
		}

		.talking .mouth-lower {
			animation-duration: 0.24s;
		}

		@keyframes cat-bob {
			50% {
				transform: translateY(-2px);
			}
		}

		@keyframes tail {
			50% {
				transform: rotate(-14deg);
			}
		}

		@keyframes limb-left {
			50% {
				transform: rotate(7deg);
			}
		}

		@keyframes limb-right {
			50% {
				transform: rotate(-7deg);
			}
		}

		@keyframes mouth {
			0%,
			100% {
				transform: scaleY(0.35);
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
