import {
	CanvasTexture,
	DirectionalLight,
	Group,
	HemisphereLight,
	Mesh,
	MeshStandardMaterial,
	PerspectiveCamera,
	Quaternion,
	Scene,
	ShadowMaterial,
	SRGBColorSpace,
	PlaneGeometry,
	RepeatWrapping,
	TorusGeometry,
	Vector3,
	WebGLRenderer,
	CylinderGeometry,
} from 'three';

const R = 1;
const T = 0.13;
const LIP = 0.045;
const REST_Y = T / 2 + LIP;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

function faceTexture(kind: 'heads' | 'tails', label: string): CanvasTexture {
	const S = 512;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = S;
	const context = canvas.getContext('2d')!;
	const gradient = context.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S / 2, S / 2, S * 0.7);
	gradient.addColorStop(0, '#ffe9a3');
	gradient.addColorStop(0.6, '#e0b24a');
	gradient.addColorStop(1, '#a8751f');
	context.fillStyle = gradient;
	context.fillRect(0, 0, S, S);
	context.translate(S / 2, S / 2);
	context.rotate(kind === 'heads' ? -Math.PI / 2 : Math.PI / 2);
	context.strokeStyle = 'rgba(120,75,10,.85)';
	context.lineWidth = 10;
	context.beginPath();
	context.arc(0, 0, S * 0.39, 0, Math.PI * 2);
	context.stroke();
	context.lineWidth = 3;
	context.beginPath();
	context.arc(0, 0, S * 0.35, 0, Math.PI * 2);
	context.stroke();
	context.textAlign = 'center';
	context.textBaseline = 'middle';

	const draw = (text: string, size: number, y: number) => {
		context.font = `800 ${size}px system-ui, sans-serif`;
		context.fillStyle = 'rgba(255,245,200,.7)';
		context.fillText(text, 3, y + 3);
		context.fillStyle = '#7a4b08';
		context.fillText(text, 0, y);
	};

	draw(kind === 'heads' ? '★' : '1', S * (kind === 'heads' ? 0.32 : 0.46), -S * 0.04);
	draw(label.toUpperCase(), S * 0.095, S * 0.2);

	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = 8;

	return texture;
}

function edgeTexture(): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 16;
	canvas.height = 8;
	const context = canvas.getContext('2d')!;
	context.fillStyle = '#c99a3a';
	context.fillRect(0, 0, 16, 8);
	context.fillStyle = '#7d5614';
	context.fillRect(0, 0, 6, 8);
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.wrapS = RepeatWrapping;
	texture.repeat.set(70, 1);

	return texture;
}

interface FlipJob {
	t: number;
	result: 'heads' | 'tails';
	base: number;
	total: number;
	x0: number;
	x1: number;
	z0: number;
	z1: number;
	height: number;
	phase: number;
	target: number;
}

export class CoinScene {
	private readonly host: HTMLElement;
	private readonly renderer: WebGLRenderer;
	private readonly scene = new Scene();
	private readonly camera = new PerspectiveCamera(40, 1, 0.1, 100);
	private readonly coin = new Group();
	private heads = 'Орёл';
	private tails = 'Решка';
	private body?: Mesh;
	private job: FlipJob | null = null;
	private currentAngle = 0;
	private frame = 0;
	private clock = 0;
	private disposed = false;

	constructor(host: HTMLElement) {
		this.host = host;
		this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.domElement.className = 'dice-canvas';
		this.host.replaceChildren(this.renderer.domElement);

		this.camera.position.set(0, 6, 6);
		this.camera.lookAt(0, 1.3, 0);
		this.scene.add(new HemisphereLight(0xffffff, 0x334455, 1.2));
		const sun = new DirectionalLight(0xffffff, 2.6);
		sun.position.set(-3, 9, 4);
		sun.castShadow = true;
		this.scene.add(sun);
		const floor = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.4 }));
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		this.scene.add(floor);
		this.scene.add(this.coin);
		this.coin.position.y = REST_Y;
		this.rebuild();
		this.resize();
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	setLabels(heads: string, tails: string): void {
		if (heads === this.heads && tails === this.tails) return;
		this.heads = heads;
		this.tails = tails;
		this.rebuild();
	}

	private rebuild(): void {
		if (this.body) {
			this.coin.remove(this.body);
			this.body.geometry.dispose();
		}
		const gold = { roughness: 0.32, metalness: 0.55 };
		this.body = new Mesh(
			new CylinderGeometry(R, R, T, 96),
			[
				new MeshStandardMaterial({ map: edgeTexture(), ...gold }),
				new MeshStandardMaterial({ map: faceTexture('heads', this.heads), ...gold }),
				new MeshStandardMaterial({ map: faceTexture('tails', this.tails), ...gold }),
			],
		);
		this.body.castShadow = this.body.receiveShadow = true;
		this.coin.add(this.body);
		const rimMat = new MeshStandardMaterial({ color: 0xd9a93f, ...gold });
		for (const sign of [1, -1]) {
			const rim = new Mesh(new TorusGeometry(R - LIP, LIP, 16, 96), rimMat);
			rim.rotation.x = Math.PI / 2;
			rim.position.y = (sign * T) / 2;
			rim.castShadow = true;
			this.coin.add(rim);
		}
		this.coin.quaternion.setFromAxisAngle(X_AXIS, this.currentAngle);
	}

	flip(result: 'heads' | 'tails'): void {
		if (this.job) return;
		const target = result === 'heads' ? 0 : Math.PI;
		const delta = (((target - this.currentAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		const spins = 4 + Math.floor(Math.random() * 4);
		this.job = {
			t: 0,
			result,
			base: this.currentAngle,
			total: delta + spins * 2 * Math.PI,
			x0: this.coin.position.x,
			x1: (Math.random() - 0.5) * 1.6,
			z0: this.coin.position.z,
			z1: (Math.random() - 0.5) * 1.2,
			height: 3 + Math.random() * 0.8,
			phase: Math.random() * 6.28,
			target,
		};
	}

	private loop = (): void => {
		if (this.disposed) return;
		const now = performance.now();
		const dt = Math.min(0.05, (now - this.clock) / 1000 || 0.016);
		this.clock = now;
		this.update(dt);
		this.renderer.render(this.scene, this.camera);
		this.frame = requestAnimationFrame(this.loop);
	};

	private update(dt: number): void {
		const job = this.job;
		if (!job) return;
		job.t = Math.min(1, job.t + dt / 2.2);
		const t = job.t;
		let y: number;
		let angle: number;
		const air = 0.7;
		if (t < air) {
			const p = t / air;
			y = REST_Y + job.height * 4 * p * (1 - p);
			angle = job.base + job.total * (1 - (1 - p) ** 2);
		} else {
			const b = (t - air) / (1 - air);
			y = REST_Y + 0.3 * Math.abs(Math.sin(Math.PI * 2 * b)) * (1 - b) ** 2;
			angle = job.base + job.total;
		}
		const wobble = 0.35 * (1 - t) ** 1.5 * Math.sin(t * 20 + job.phase);
		const qa = new Quaternion().setFromAxisAngle(Z_AXIS, wobble);
		const qb = new Quaternion().setFromAxisAngle(X_AXIS, angle);
		this.coin.quaternion.copy(qa).multiply(qb);
		const ay = Math.abs(new Vector3(0, 1, 0).applyQuaternion(this.coin.quaternion).y);
		y = Math.max(y, R * Math.sqrt(1 - ay * ay) + REST_Y * ay);
		const ease = 1 - (1 - Math.min(1, t / air)) ** 2;
		this.coin.position.set(job.x0 + (job.x1 - job.x0) * ease, y, job.z0 + (job.z1 - job.z0) * ease);
		if (t >= 1) {
			this.currentAngle = job.target;
			this.coin.quaternion.setFromAxisAngle(X_AXIS, this.currentAngle);
			this.coin.position.y = REST_Y;
			this.job = null;
		}
	}

	resize(): void {
		const width = this.host.clientWidth || 140;
		const height = this.host.clientHeight || 140;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	destroy(): void {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.body?.geometry.dispose();
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}
