// @ts-nocheck
import * as THREE from 'three';

const V3 = THREE.Vector3;
const PHI = (1 + Math.sqrt(5)) / 2;
const UP = new V3(0, 1, 0);
const unit = (x: number, y: number, z: number) => new V3(x, y, z).normalize();

function platonicNormals(N: number) {
	const s = [-1, 1];
	const out: any[] = [];

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

function trapezohedronNormals(N: number, H = 1) {
	const n = N / 2;
	const th = Math.PI / n;
	const phi = Math.atan((1 + Math.cos(th)) / (2 * H));
	const out: any[] = [];

	for (let k = 0; k < n; k++) {
		const a = 2 * th * k;
		const b = a + th;

		out.push(new V3(Math.cos(a) * Math.cos(phi), Math.sin(phi), Math.sin(a) * Math.cos(phi)));
		out.push(new V3(Math.cos(b) * Math.cos(phi), -Math.sin(phi), Math.sin(b) * Math.cos(phi)));
	}

	return out;
}

function mulberry32(a: number) {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);

		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function relaxedSphere(N: number, iters = 180) {
	const rnd = mulberry32(N * 7919 + 1);
	const P: any[] = [];

	for (let i = 0; i < N; i++) {
		const y = 1 - (2 * (i + 0.5)) / N;
		const r = Math.sqrt(1 - y * y);
		const a = i * Math.PI * (3 - Math.sqrt(5));

		P.push(new V3(Math.cos(a) * r + (rnd() - 0.5) * 0.02, y, Math.sin(a) * r + (rnd() - 0.5) * 0.02).normalize());
	}

	const h = Math.sqrt((4 * Math.PI) / N);
	let step = 0.05 * h ** 3;
	const F = P.map(() => new V3());
	const d = new V3();

	for (let it = 0; it < iters; it++) {
		F.forEach((f) => f.set(0, 0, 0));

		for (let i = 0; i < N; i++) {
			for (let j = i + 1; j < N; j++) {
				d.subVectors(P[i], P[j]);
				const r2 = d.lengthSq() + 1e-9;

				d.multiplyScalar(1 / (r2 * Math.sqrt(r2)));
				F[i].add(d);
				F[j].sub(d);
			}
		}

		for (let i = 0; i < N; i++) P[i].addScaledVector(F[i], step).normalize();
		step *= 0.985;
	}

	return P;
}

function dualFaces(P: any[]) {
	const N = P.length;
	const X = P.map((p) => p.x);
	const Y = P.map((p) => p.y);
	const Z = P.map((p) => p.z);
	const verts: any[] = [];

	for (let i = 0; i < N; i++) {
		for (let j = i + 1; j < N; j++) {
			const ax = Y[i] * Z[j] - Z[i] * Y[j];
			const ay = Z[i] * X[j] - X[i] * Z[j];
			const az = X[i] * Y[j] - Y[i] * X[j];

			for (let k = j + 1; k < N; k++) {
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

				for (let m = 0; m < N; m++) {
					if (vx * X[m] + vy * Y[m] + vz * Z[m] > 1 + 1e-7) {
						ok = false;
						break;
					}
				}

				if (!ok) continue;
				if (verts.some((w) => (w.x - vx) ** 2 + (w.y - vy) ** 2 + (w.z - vz) ** 2 < 1e-12)) continue;

				verts.push(new V3(vx, vy, vz));
			}
		}
	}

	if (verts.length < 4) throw new Error('Origin is not inside the hull of the normals');

	return P.map((n) => ({
		n: n.clone(),
		pts: verts.filter((v) => Math.abs(v.dot(n) - 1) < 1e-6),
		labeled: true,
	}));
}

function prismFaces(m: number, R: number, H: number, labelSides: boolean) {
	const top: any[] = [];
	const bot: any[] = [];

	for (let k = 0; k < m; k++) {
		const a = (2 * Math.PI * k) / m;

		top.push(new V3(R * Math.cos(a), H / 2, R * Math.sin(a)));
		bot.push(new V3(R * Math.cos(a), -H / 2, R * Math.sin(a)));
	}

	const faces: any[] = [];

	for (let k = 0; k < m; k++) {
		const k2 = (k + 1) % m;
		const mid = (2 * Math.PI * (k + 0.5)) / m;

		faces.push({ n: new V3(Math.cos(mid), 0, Math.sin(mid)), pts: [top[k], top[k2], bot[k2], bot[k]], labeled: labelSides });
	}

	faces.push({ n: new V3(0, 1, 0), pts: top, labeled: !labelSides });
	faces.push({ n: new V3(0, -1, 0), pts: bot, labeled: !labelSides });

	return faces;
}

function analyze(f: any) {
	const n = f.n;
	const e1 = new V3().crossVectors(Math.abs(n.y) < 0.9 ? UP : new V3(1, 0, 0), n).normalize();
	const e2 = new V3().crossVectors(n, e1);
	const avg = f.pts.reduce((s, p) => s.add(p), new V3()).multiplyScalar(1 / f.pts.length);
	const ang = (p) => Math.atan2(p.clone().sub(avg).dot(e2), p.clone().sub(avg).dot(e1));

	f.pts.sort((a, b) => ang(a) - ang(b));

	const q = f.pts.map((p) => [p.dot(e1), p.dot(e2)]);
	const k = q.length;
	let A = 0;
	let Cx = 0;
	let Cy = 0;

	for (let i = 0; i < k; i++) {
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

	for (let i = 0; i < k; i++) {
		const [x0, y0] = q[i];
		const [x1, y1] = q[(i + 1) % k];
		const len = Math.hypot(x1 - x0, y1 - y0);

		if (len < 1e-9) continue;
		r = Math.min(r, ((x1 - x0) * (Cy - y0) - (y1 - y0) * (Cx - x0)) / len);
	}

	const dist = n.dot(f.pts[0]);
	const rad = q.map(([x, y]) => Math.hypot(x - Cx, y - Cy));
	const mx = Math.max(...rad);
	const mn = Math.min(...rad);
	let dx;
	let dy;

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

	f.k = k;
	f.area = Math.abs(A);
	f.dist = dist;
	f.r2 = r;
	f.center = e1.clone().multiplyScalar(Cx).addScaledVector(e2, Cy).addScaledVector(n, dist);
	f.u = e1.clone().multiplyScalar(dx).addScaledVector(e2, dy).normalize();
}

function assignValues(faces: any[], N: number) {
	const left = new Set(faces.filter((f) => f.labeled));
	const order = [...left].sort((a, b) => b.n.y - a.n.y || b.n.x - a.n.x);
	let lo = 1;

	for (const f of order) {
		if (!left.has(f)) continue;
		left.delete(f);
		let best = null;
		let bd = Infinity;

		for (const g of left) {
			const d = f.n.dot(g.n);

			if (d < bd) {
				bd = d;
				best = g;
			}
		}

		if (best) {
			left.delete(best);
			f.value = lo;
			best.value = N + 1 - lo;
			lo++;
		} else {
			f.value = (N + 1) / 2;
		}
	}
}

function polyData(N: number) {
	let faces;

	if (N === 4) faces = dualFaces(platonicNormals(6));
	else if ([6, 8, 12, 20].includes(N)) faces = dualFaces(platonicNormals(N));
	else if (N === 2) faces = prismFaces(48, 1, 0.35, false);
	else if (N === 3) faces = dualFaces(platonicNormals(4));
	else if (N % 2 === 0 && N <= 16) faces = dualFaces(trapezohedronNormals(N));
	else faces = dualFaces(relaxedSphere(N));

	faces.forEach((f) => {
		f.pts = f.pts.map((p) => p.clone());
		analyze(f);
	});

	const volume = faces.reduce((s, f) => s + (f.area * f.dist) / 3, 0);
	const scale = Math.cbrt((4 / 3) * Math.PI / Math.max(0.0001, volume));

	faces.forEach((f) => {
		f.pts.forEach((p) => p.multiplyScalar(scale));
		analyze(f);
	});
	if (N === 4) {
		faces.forEach((face, index) => {
			face.labeled = index < 4;
			face.value = index < 4 ? index + 1 : undefined;
		});
	} else if (N === 3) {
		faces.forEach((face, index) => {
			face.labeled = index < 3;
			face.value = index < 3 ? index + 1 : undefined;
		});
	} else {
		assignValues(faces, N);
	}

	const pos = [];
	const nrm = [];

	for (const f of faces) {
		for (let i = 1; i < f.pts.length - 1; i++) {
			for (const p of [f.pts[0], f.pts[i], f.pts[i + 1]]) {
				pos.push(p.x, p.y, p.z);
				nrm.push(f.n.x, f.n.y, f.n.z);
			}
		}
	}

	const geometry = new THREE.BufferGeometry();

	geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));

	let offset = 0;

	for (const f of faces) {
		const count = (f.pts.length - 2) * 3;

		geometry.addGroup(offset, count, 0);
		offset += count;
	}

	return { geometry, faces, smooth: false };
}

function sphereData() {
	const cut = 0.9;
	const g = new THREE.SphereGeometry(1, 40, 28);
	const p = g.attributes.position;
	const n = g.attributes.normal;

	for (let i = 0; i < p.count; i++) {
		if (p.getY(i) > cut) {
			p.setY(i, cut);
			n.setXYZ(i, 0, 1, 0);
		}
	}

	const face = {
		n: UP.clone(), u: new V3(0, 0, -1), center: new V3(0, cut, 0),
		dist: cut, r2: Math.sqrt(1 - cut * cut) * 0.9, k: 0, labeled: true, value: 1, pts: [],
	};

	return { geometry: g, faces: [face], smooth: true };
}

const FLIP = { 0: '0', 1: '1', 6: '9', 8: '8', 9: '6' };

function isAmbiguous(s: string) {
	const r = [...s].reverse().map((c) => FLIP[c]);

	if (r.some((c) => c === undefined)) return false;

	const t = r.join('');

	return t !== s && t[0] !== '0';
}

const labelCache = new Map();

function labelTexture(value: string | number) {
	if (labelCache.has(value)) return labelCache.get(value);

	const S = 256;
	const c = document.createElement('canvas');

	c.width = c.height = S;
	const ctx = c.getContext('2d');
	const text = String(value);
	let size = 170;

	ctx.font = `700 ${size}px system-ui, sans-serif`;
	let w = ctx.measureText(text).width;

	if (w > S * 0.82) {
		size *= (S * 0.82) / w;
		ctx.font = `700 ${size}px system-ui, sans-serif`;
		w = ctx.measureText(text).width;
	}

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	ctx.lineWidth = size * 0.12;
	ctx.strokeStyle = 'rgba(0,0,0,.55)';
	ctx.strokeText(text, S / 2, S / 2 + size * 0.04);
	ctx.fillStyle = '#fff';
	ctx.fillText(text, S / 2, S / 2 + size * 0.04);

	if (isAmbiguous(text)) ctx.fillRect(S / 2 - w / 2, S / 2 + size * 0.45, w, size * 0.07);

	const tex = new THREE.CanvasTexture(c);

	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	labelCache.set(value, tex);

	return tex;
}

function makeLabel(f: any, value: string | number) {
	const side = f.r2 * 2 * (f.k <= 3 && f.k > 0 ? 0.8 : 0.95);
	const mat = new THREE.MeshStandardMaterial({
		map: labelTexture(value), transparent: true, roughness: 0.5,
		polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
	});
	const m = new THREE.Mesh(new THREE.PlaneGeometry(side, side), mat);

	m.position.copy(f.center).addScaledVector(f.n, 0.004);
	const X = new V3().crossVectors(f.u, f.n);

	m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, f.u, f.n));

	return m;
}

function createDie(N: number, opts: any = {}) {
	if (!Number.isInteger(N) || N < 1 || N > 100) throw new RangeError('N must be an integer in 1..100');
	const { color = 0x3d6fd1, labels = true, labelValues } = opts;
	const data = N === 1 ? sphereData() : polyData(N);
	const die = new THREE.Group();
	const body = new THREE.Mesh(
		data.geometry,
		new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.15, flatShading: !data.smooth }),
	);

	body.castShadow = body.receiveShadow = true;
	die.add(body);
	die.add(new THREE.LineSegments(
		new THREE.EdgesGeometry(data.geometry, 5),
		new THREE.LineBasicMaterial({ color: 0xf5eaff, transparent: true, opacity: 0.7 }),
	));

	const faceByValue = new Map();

	for (const f of data.faces) {
		if (!f.labeled) continue;
		faceByValue.set(f.value, f);
		if (labels) die.add(makeLabel(f, labelValues?.[f.value] ?? f.value));
	}

	die.userData = { N, faces: data.faces, faceByValue, support: uniquePositions(data.geometry) };

	return die;
}

function uniquePositions(geometry: any) {
	const a = geometry.attributes.position;
	const map = new Map();

	for (let i = 0; i < a.count; i++) {
		const key = `${a.getX(i).toFixed(4)},${a.getY(i).toFixed(4)},${a.getZ(i).toFixed(4)}`;

		if (!map.has(key)) map.set(key, new V3(a.getX(i), a.getY(i), a.getZ(i)));
	}

	return [...map.values()];
}

function disposeDie(die: any) {
	die.traverse((o) => {
		if (o.geometry) o.geometry.dispose();
		if (o.material) o.material.dispose();
	});
}

function restQuaternion(f: any) {
	const X = new V3().crossVectors(f.u, f.n);

	return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, f.n, f.u.clone().negate())).invert();
}

function facingQuaternion(f: any, dir: any, upHint = UP) {
	const up = upHint.clone().addScaledVector(dir, -upHint.dot(dir)).normalize();
	const right = new V3().crossVectors(up, dir);
	const qW = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, dir));
	const Xm = new V3().crossVectors(f.u, f.n);
	const qM = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xm, f.u, f.n));

	return qW.multiply(qM.invert());
}

function supportHeight(points: any[], q: any) {
	const v = new V3();
	let m = Infinity;

	for (const p of points) {
		v.copy(p).applyQuaternion(q);
		if (v.y < m) m = v.y;
	}

	return -m;
}

class DiceAnimator {
	private active = new Set<any>();
	private camera: any;

	constructor(opts: any = {}) {
		this.camera = opts.camera ?? null;
	}

	private finalQuaternion(f: any, x: number, z: number, yaw = 0) {
		if (!this.camera) return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(restQuaternion(f));

		this.camera.updateMatrixWorld();
		const dir = this.camera.position.clone().sub(new V3(x, 1, z)).normalize();
		const camUp = new V3(0, 1, 0).applyQuaternion(this.camera.quaternion);

		return facingQuaternion(f, dir, camUp);
	}

	place(die: any, value: number, opts: any = {}) {
		const q = this.finalQuaternion(die.userData.faceByValue.get(value), opts.x ?? 0, opts.z ?? 0, opts.yaw ?? 0);

		die.quaternion.copy(q);
		die.position.set(opts.x ?? 0, supportHeight(die.userData.support, q), opts.z ?? 0);
	}

	roll(die: any, value: number, opts: any = {}) {
		const f = die.userData.faceByValue.get(value);

		if (!f) throw new RangeError(`No face with value ${value}`);

		const rnd = Math.random;
		const yaw = opts.yaw ?? (rnd() - 0.5) * 0.8;
		const to = opts.to ?? new V3((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
		const qFinal = this.finalQuaternion(f, to.x, to.z, yaw);
		const from = opts.from ?? new V3(-1.8 + rnd() * 0.5, 2.4 + rnd() * 0.4, 1.2 + rnd());

		return new Promise((resolve) => {
			this.active.add({
				die, value, resolve, qFinal, from, to, t: 0,
				axis: new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
				angle0: Math.PI * 2 * (opts.spins ?? 2 + rnd() * 2),
				duration: opts.duration ?? 1.4,
				bounces: opts.bounces ?? 2,
				height: opts.height ?? 1.0,
				restY: supportHeight(die.userData.support, qFinal),
				q: new THREE.Quaternion(),
			});
		});
	}

	update(dt: number) {
		for (const r of this.active) {
			r.t = Math.min(1, r.t + dt / r.duration);
			const t = r.t;
			const e = 1 - (1 - t) ** 3;

			r.q.setFromAxisAngle(r.axis, r.angle0 * (1 - e)).multiply(r.qFinal);
			r.die.quaternion.copy(r.q);
			const h = 1 - (1 - t) ** 2.2;

			r.die.position.x = r.from.x + (r.to.x - r.from.x) * h;
			r.die.position.z = r.from.z + (r.to.z - r.from.z) * h;
			let y = r.restY + (r.from.y - r.restY) * (1 - t) ** 3 + r.height * Math.abs(Math.sin(Math.PI * r.bounces * t)) * (1 - t) ** 2;

			y = Math.max(y, supportHeight(r.die.userData.support, r.q));
			r.die.position.y = y;

			if (t >= 1) {
				this.active.delete(r);
				r.resolve(r.value);
			}
		}
	}
}

export function buildGeometry(sides: number) {
	const data = polyData(sides);

	return { geometry: data.geometry, values: data.faces.map((f) => f.value ?? 1) };
}

export class DiceScene {
	private readonly host: HTMLElement;
	private readonly renderer: any;
	private readonly scene = new THREE.Scene();
	private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
	private readonly animator: DiceAnimator;
	private die: any;
	private sides = 0;
	private labelKey = '';
	private clock = new THREE.Clock();
	private frame = 0;
	private disposed = false;

	constructor(host: HTMLElement, accent = '#ff2ea6') {
		this.host = host;
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.domElement.className = 'dice-canvas';
		this.host.replaceChildren(this.renderer.domElement);

		this.camera.position.set(0, 5.2, 6.2);
		this.camera.lookAt(0, 0.4, 0);
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.25));
		const sun = new THREE.DirectionalLight(0xffffff, 2.6);

		sun.position.set(-3, 8, 4);
		this.scene.add(sun);
		this.animator = new DiceAnimator({ camera: this.camera });
		this.accent = accent;
		this.resize();
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	private readonly accent: string;
	private edgeColor = '#f5eaff';
	private edgeWidth = 1;
	private edgeOpacity = 0.7;

	setEdgeStyle(color: string, width: number, opacity: number) {
		this.edgeColor = color;
		this.edgeWidth = width;
		this.edgeOpacity = opacity;

		this.die?.traverse((object: any) => {
			if (object instanceof THREE.LineSegments && object.material instanceof THREE.LineBasicMaterial) {
				object.material.color.set(color);
				object.material.linewidth = width;
				object.material.opacity = opacity;
			}
		});
	}

	setSides(sides: number, labels?: (string | number)[]) {
		const labelKey = labels?.join('|') ?? '';

		if (this.sides === sides && this.labelKey === labelKey && this.die) return;

		this.sides = sides;
		this.labelKey = labelKey;

		if (this.die) {
			this.scene.remove(this.die);
			disposeDie(this.die);
		}

		const color = new THREE.Color(this.accent);
		const labelValues = labels ? { 1: labels[0], 2: labels[1] } : undefined;

		this.die = createDie(sides, { color, labelValues });
		this.scene.add(this.die);
		this.setEdgeStyle(this.edgeColor, this.edgeWidth, this.edgeOpacity);
		this.animator.place(this.die, 1, { yaw: 0.2 });
		this.resize();
	}

	roll(result: number) {
		if (!this.die) return;

		const value = Math.min(this.sides, Math.max(1, result));
		this.animator.roll(this.die, value);
	}

	private loop() {
		if (this.disposed) return;

		this.animator.update(Math.min(this.clock.getDelta(), 0.05));
		this.renderer.render(this.scene, this.camera);
		this.frame = requestAnimationFrame(this.loop);
	}

	resize() {
		const width = this.host.clientWidth || 180;
		const height = this.host.clientHeight || 180;

		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	destroy() {
		this.disposed = true;
		cancelAnimationFrame(this.frame);

		if (this.die) disposeDie(this.die);
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}
