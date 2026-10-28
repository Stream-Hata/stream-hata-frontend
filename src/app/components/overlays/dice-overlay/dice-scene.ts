import {
	AmbientLight,
	BufferGeometry,
	CanvasTexture,
	Color,
	DirectionalLight,
	EdgesGeometry,
	Euler,
	Float32BufferAttribute,
	Group,
	LineBasicMaterial,
	LineSegments,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	Quaternion,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from 'three';

const PHI = (1 + Math.sqrt(5)) / 2;
const UP = new Vector3(0, 1, 0);
const unit = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize();

interface Face {
	n: Vector3;
	u: Vector3;
	pts: Vector3[];
	center: Vector3;
	dist: number;
	r2: number;
	k: number;
	labeled: boolean;
	value?: number;
}

interface DieData {
	geometry: BufferGeometry;
	faces: Face[];
}

function platonicNormals(N: number): Vector3[] {
	const s = [-1, 1];
	const out: Vector3[] = [];

	if (N === 4) return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((p) => unit(p[0], p[1], p[2]));
	if (N === 6) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((p) => unit(p[0], p[1], p[2]));

	for (const x of s) for (const y of s) for (const z of s) out.push(unit(x, y, z));
	if (N === 8) return out;

	if (N === 12) {
		out.length = 0;
		for (const a of s) for (const b of s) out.push(unit(0, a, b * PHI), unit(a, b * PHI, 0), unit(b * PHI, 0, a));

		return out;
	}

	for (const a of s) for (const b of s) out.push(unit(0, a / PHI, b * PHI), unit(a / PHI, b * PHI, 0), unit(b * PHI, 0, a / PHI));

	return out;
}

function trapezohedronNormals(N: number, H = 1): Vector3[] {
	const n = N / 2;
	const th = Math.PI / n;
	const phi = Math.atan((1 + Math.cos(th)) / (2 * H));
	const out: Vector3[] = [];

	for (let k = 0; k < n; k += 1) {
		const a = 2 * th * k;
		const b = a + th;

		out.push(new Vector3(Math.cos(a) * Math.cos(phi), Math.sin(phi), Math.sin(a) * Math.cos(phi)));
		out.push(new Vector3(Math.cos(b) * Math.cos(phi), -Math.sin(phi), Math.sin(b) * Math.cos(phi)));
	}

	return out;
}

function mulberry32(a: number): () => number {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);

		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function relaxedSphere(N: number, iters = 180): Vector3[] {
	const rnd = mulberry32(N * 7919 + 1);
	const points: Vector3[] = [];

	for (let i = 0; i < N; i += 1) {
		const y = 1 - (2 * (i + 0.5)) / N;
		const r = Math.sqrt(1 - y * y);
		const a = i * Math.PI * (3 - Math.sqrt(5));

		points.push(new Vector3(Math.cos(a) * r + (rnd() - 0.5) * 0.02, y, Math.sin(a) * r + (rnd() - 0.5) * 0.02).normalize());
	}

	const h = Math.sqrt((4 * Math.PI) / N);
	let step = 0.05 * h ** 3;
	const forces = points.map(() => new Vector3());
	const d = new Vector3();

	for (let it = 0; it < iters; it += 1) {
		forces.forEach((f) => f.set(0, 0, 0));

		for (let i = 0; i < N; i += 1) {
			for (let j = i + 1; j < N; j += 1) {
				d.subVectors(points[i], points[j]);
				const r2 = d.lengthSq() + 1e-9;

				d.multiplyScalar(1 / (r2 * Math.sqrt(r2)));
				forces[i].add(d);
				forces[j].sub(d);
			}
		}

		for (let i = 0; i < N; i += 1) points[i].addScaledVector(forces[i], step).normalize();
		step *= 0.985;
	}

	return points;
}

function dualFaces(points: Vector3[]): Face[] {
	const N = points.length;
	const X = points.map((p) => p.x);
	const Y = points.map((p) => p.y);
	const Z = points.map((p) => p.z);
	const verts: Vector3[] = [];

	for (let i = 0; i < N; i += 1) {
		for (let j = i + 1; j < N; j += 1) {
			const ax = Y[i] * Z[j] - Z[i] * Y[j];
			const ay = Z[i] * X[j] - X[i] * Z[j];
			const az = X[i] * Y[j] - Y[i] * X[j];

			for (let k = j + 1; k < N; k += 1) {
				const det = ax * X[k] + ay * Y[k] + az * Z[k];

				if (Math.abs(det) < 1e-9) continue;

				const bx = Y[j] * Z[k] - Z[j] * Y[k];
				const by = Z[j] * X[k] - X[j] * Z[k];
				const bz = X[j] * Y[k] - Y[j] * X[k];
				const cx = Y[k] * Z[i] - Z[k] * Y[i];
				const cy = Z[k] * X[i] - X[k] * Z[i];
				const cz = X[k] * Y[i] - Y[k] * X[i];
				const vx = (ax + bx + cx) / det;
				const vy = (ay + by + cy) / det;
				const vz = (az + bz + cz) / det;
				let ok = true;

				for (let m = 0; m < N; m += 1) {
					if (vx * X[m] + vy * Y[m] + vz * Z[m] > 1 + 1e-7) {
						ok = false;

						break;
					}
				}

				if (!ok) continue;
				if (verts.some((w) => (w.x - vx) ** 2 + (w.y - vy) ** 2 + (w.z - vz) ** 2 < 1e-12)) continue;

				verts.push(new Vector3(vx, vy, vz));
			}
		}
	}

	if (verts.length < 4) throw new Error('Origin is not inside the hull of the normals');

	return points.map((n) => ({
		n: n.clone(),
		pts: verts.filter((v) => Math.abs(v.dot(n) - 1) < 1e-6),
		labeled: true,
		u: new Vector3(),
		center: new Vector3(),
		dist: 0,
		r2: 0,
		k: 0,
	}));
}

function prismFaces(m: number, R: number, H: number, labelSides: boolean): Face[] {
	const top: Vector3[] = [];
	const bot: Vector3[] = [];

	for (let k = 0; k < m; k += 1) {
		const a = (2 * Math.PI * k) / m;

		top.push(new Vector3(R * Math.cos(a), H / 2, R * Math.sin(a)));
		bot.push(new Vector3(R * Math.cos(a), -H / 2, R * Math.sin(a)));
	}

	const faces: Face[] = [];

	for (let k = 0; k < m; k += 1) {
		const k2 = (k + 1) % m;
		const mid = (2 * Math.PI * (k + 0.5)) / m;

		faces.push({
			n: new Vector3(Math.cos(mid), 0, Math.sin(mid)),
			pts: [top[k], top[k2], bot[k2], bot[k]],
			labeled: labelSides,
			u: new Vector3(),
			center: new Vector3(),
			dist: 0,
			r2: 0,
			k: 0,
		});
	}

	faces.push({
		n: new Vector3(0, 1, 0), pts: top, labeled: !labelSides,
		u: new Vector3(), center: new Vector3(), dist: 0, r2: 0, k: 0,
	});
	faces.push({
		n: new Vector3(0, -1, 0), pts: bot, labeled: !labelSides,
		u: new Vector3(), center: new Vector3(), dist: 0, r2: 0, k: 0,
	});

	return faces;
}

function analyze(face: Face): void {
	const n = face.n;
	const e1 = new Vector3().crossVectors(Math.abs(n.y) < 0.9 ? UP : new Vector3(1, 0, 0), n).normalize();
	const e2 = new Vector3().crossVectors(n, e1);
	const avg = face.pts.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / face.pts.length);
	const angle = (p: Vector3) => Math.atan2(p.clone().sub(avg).dot(e2), p.clone().sub(avg).dot(e1));

	face.pts.sort((a, b) => angle(a) - angle(b));

	const q = face.pts.map((p) => [p.dot(e1), p.dot(e2)] as [number, number]);
	const k = q.length;
	let A = 0;
	let Cx = 0;
	let Cy = 0;

	for (let i = 0; i < k; i += 1) {
		const [x0, y0] = q[i];
		const [x1, y1] = q[(i + 1) % k];
		const cr = x0 * y1 - x1 * y0;

		A += cr;
		Cx += (x0 + x1) * cr;
		Cy += (y0 + y1) * cr;
	}

	A /= 2;
	Cx /= 6 * A;
	Cy /= 6 * A;

	let r = Infinity;

	for (let i = 0; i < k; i += 1) {
		const [x0, y0] = q[i];
		const [x1, y1] = q[(i + 1) % k];
		const len = Math.hypot(x1 - x0, y1 - y0);

		if (len < 1e-9) continue;
		r = Math.min(r, ((x1 - x0) * (Cy - y0) - (y1 - y0) * (Cx - x0)) / len);
	}

	const dist = n.dot(face.pts[0]);
	const rad = q.map(([x, y]) => Math.hypot(x - Cx, y - Cy));
	const mx = Math.max(...rad);
	const mn = Math.min(...rad);
	let dx: number;
	let dy: number;

	if (mx - mn < 1e-4 * mx) {
		if (k % 2 === 0) {
			dx = (q[0][0] + q[1][0]) / 2 - Cx;
			dy = (q[0][1] + q[1][1]) / 2 - Cy;
		} else {
			dx = q[0][0] - Cx;
			dy = q[0][1] - Cy;
		}
	} else {
		const i = rad.indexOf(mx);

		dx = q[i][0] - Cx;
		dy = q[i][1] - Cy;
	}

	face.k = k;
	face.dist = dist;
	face.r2 = r;
	face.center = e1.clone().multiplyScalar(Cx).addScaledVector(e2, Cy).addScaledVector(n, dist);
	face.u = e1.clone().multiplyScalar(dx).addScaledVector(e2, dy).normalize();
}

function assignValues(faces: Face[], N: number): void {
	const left = new Set(faces.filter((f) => f.labeled));
	const order = [...left].sort((a, b) => b.n.y - a.n.y || b.n.x - a.n.x);
	let lo = 1;

	for (const face of order) {
		if (!left.has(face)) continue;
		left.delete(face);
		let best: Face | null = null;
		let bd = Infinity;

		for (const other of left) {
			const d = face.n.dot(other.n);

			if (d < bd) {
				bd = d;
				best = other;
			}
		}

		if (best) {
			left.delete(best);
			face.value = lo;
			best.value = N + 1 - lo;
			lo += 1;
		} else {
			face.value = (N + 1) / 2;
		}
	}
}

function polyData(N: number): DieData {
	let faces: Face[];

	if ([4, 6, 8, 12, 20].includes(N)) faces = dualFaces(platonicNormals(N));
	else if (N === 2) faces = prismFaces(48, 1, 0.35, false);
	else if (N === 3) faces = prismFaces(3, 1, 2.4, true);
	else if (N % 2 === 0 && N <= 16) faces = dualFaces(trapezohedronNormals(N));
	else faces = dualFaces(relaxedSphere(N));

	faces.forEach((f) => {
		f.pts = f.pts.map((p) => p.clone());
		analyze(f);
	});

	const volume = faces.reduce((s, f) => s + (f.dist * f.r2) / 3, 0);
	const scale = Math.cbrt((4 / 3) * Math.PI / Math.max(0.0001, volume));

	faces.forEach((f) => {
		f.pts.forEach((p) => p.multiplyScalar(scale));
		analyze(f);
	});
	assignValues(faces, N);

	const positions: number[] = [];

	for (const face of faces) {
		for (let i = 1; i < face.pts.length - 1; i += 1) {
			for (const p of [face.pts[0], face.pts[i], face.pts[i + 1]]) positions.push(p.x, p.y, p.z);
		}
	}

	const geometry = new BufferGeometry();

	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();

	let offset = 0;
	for (const face of faces) {
		const count = (face.pts.length - 2) * 3;

		geometry.addGroup(offset, count, 0);
		offset += count;
	}

	return { geometry, faces };
}

function labelTexture(value: string | number, accent: Color): CanvasTexture {
	const canvas = document.createElement('canvas');

	canvas.width = 256;
	canvas.height = 256;
	const context = canvas.getContext('2d');

	if (context) {
		context.clearRect(0, 0, 256, 256);
		context.font = '800 150px Inter, sans-serif';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.lineJoin = 'round';
		context.lineWidth = 18;
		context.strokeStyle = 'rgba(0,0,0,.65)';
		context.strokeText(String(value), 128, 138);
		context.fillStyle = '#fff';
		context.fillText(String(value), 128, 138);
	}

	const texture = new CanvasTexture(canvas);

	texture.colorSpace = SRGBColorSpace;

	return texture;
}

function createDie(sides: number, accent: Color, labels?: (string | number)[]): { group: Group; faces: Face[] } {
	const data = polyData(sides);
	const group = new Group();
	const body = new Mesh(
		data.geometry,
		new MeshStandardMaterial({
			color: accent.clone().multiplyScalar(0.72),
			roughness: 0.48,
			metalness: 0.08,
			emissive: accent.clone().multiplyScalar(0.12),
			emissiveIntensity: 0.35,
			flatShading: true,
		}),
	);

	group.add(body);
	group.add(new LineSegments(
		new EdgesGeometry(data.geometry, 8),
		new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.85 }),
	));

	for (const face of data.faces) {
		if (!face.labeled || face.value === undefined || !face.pts.length) continue;
		const value = labels?.[face.value - 1] ?? face.value;
		const side = face.r2 * 2 * (face.k <= 3 ? 0.78 : 0.95);
		const material = new MeshStandardMaterial({
			map: labelTexture(value, accent),
			transparent: true,
			roughness: 0.6,
			depthWrite: false,
		});
		const label = new Mesh(new PlaneGeometry(side, side), material);
		const x = new Vector3().crossVectors(face.u, face.n);

		label.position.copy(face.center).addScaledVector(face.n, 0.006);
		label.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, face.u, face.n));
		group.add(label);
	}

	return { group, faces: data.faces };
}

export function buildGeometry(sides: number): { geometry: BufferGeometry; values: number[] } {
	const data = polyData(sides);

	return { geometry: data.geometry, values: data.faces.map((f) => f.value ?? 1) };
}

export class DiceScene {
	private readonly host: HTMLElement;
	private readonly accent: Color;
	private readonly renderer: WebGLRenderer;
	private readonly scene = new Scene();
	private readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
	private readonly group = new Group();
	private current?: { group: Group; faces: Face[] };
	private sides = 0;
	private labelKey = '';
	private rolling = false;
	private rollStarted = 0;
	private target = new Quaternion();
	private spinAxis = new Vector3(0.7, 1, 0.35).normalize();
	private frame = 0;
	private disposed = false;

	constructor(host: HTMLElement, accent = '#ff2ea6') {
		this.host = host;
		this.accent = new Color(accent);
		this.renderer = new WebGLRenderer({ alpha: true, antialias: true });
		this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.domElement.className = 'dice-canvas';
		this.host.replaceChildren(this.renderer.domElement);
		this.camera.position.set(4.2, 2.8, 7.2);
		this.camera.lookAt(0, 0, 0);
		this.scene.add(new AmbientLight(0xffffff, 0.65));
		const light = new DirectionalLight(0xffd6f4, 3.6);
		light.position.set(-3, 5, 4);
		this.scene.add(light);
		const rim = new DirectionalLight(0x22e0ff, 2.4);
		rim.position.set(4, -2, -3);
		this.scene.add(rim);
		const point = new DirectionalLight(0xff8ad4, 1.6);
		point.position.set(2, 3, 5);
		this.scene.add(point);
		this.scene.add(this.group);
		this.resize();
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	setSides(sides: number, labels?: (string | number)[]): void {
		const labelKey = labels?.join('|') ?? '';

		if (this.sides === sides && this.labelKey === labelKey && this.current) return;

		this.sides = sides;
		this.labelKey = labelKey;
		if (this.current) this.group.remove(this.current.group);

		this.current = createDie(sides, this.accent, labels);
		this.group.add(this.current.group);
		this.resize();
	}

	roll(result: number): void {
		if (!this.current) return;
		const face = this.current.faces.find((item) => item.value === result) ?? this.current.faces[0];
		if (!face) return;
		this.target = new Quaternion().setFromUnitVectors(face.n, new Vector3(0.75, 0.45, 1).normalize());
		this.spinAxis = new Vector3(Math.random() - 0.5, Math.random() + 0.7, Math.random() - 0.5).normalize();
		this.rollStarted = performance.now();
		this.rolling = true;
	}

	private loop(now: number): void {
		if (this.disposed) return;
		if (this.current) {
			if (this.rolling) {
				const elapsed = now - this.rollStarted;
				if (elapsed < 850) {
					this.current.group.rotateOnWorldAxis(this.spinAxis, 0.22);
				} else {
					this.current.group.quaternion.slerp(this.target, 0.18);
					if (this.current.group.quaternion.angleTo(this.target) < 0.015) {
						this.current.group.quaternion.copy(this.target);
						this.rolling = false;
					}
				}
			} else {
				this.current.group.rotation.y += 0.002;
			}
		}
		this.renderer.render(this.scene, this.camera);
		this.frame = requestAnimationFrame(this.loop);
	}

	resize(): void {
		const width = this.host.clientWidth || 180;
		const height = this.host.clientHeight || 180;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	destroy(): void {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.current?.group.traverse((object) => {
			if (object instanceof Mesh) {
				object.geometry.dispose();
				if (object.material instanceof MeshStandardMaterial) {
					object.material.map?.dispose();
					object.material.dispose();
				}
			}
		});
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}
