import {
	AmbientLight,
	BufferGeometry,
	CanvasTexture,
	DirectionalLight,
	DoubleSide,
	Float32BufferAttribute,
	Group,
	IcosahedronGeometry,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshStandardMaterial,
	PerspectiveCamera,
	Quaternion,
	Scene,
	SphereGeometry,
	TetrahedronGeometry,
	Vector3,
	WebGLRenderer,
	BoxGeometry,
	DodecahedronGeometry,
	EdgesGeometry,
	OctahedronGeometry,
	CylinderGeometry,
	SRGBColorSpace,
	Color,
} from 'three';

interface DiceBuild {
	geometry: BufferGeometry;
	values: number[];
	mesh: Mesh;
	edges: LineSegments;
}

const ACCENT = new Color('#ff2ea6');

function faceMaterial(value: string | number, accent: Color): MeshStandardMaterial {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const context = canvas.getContext('2d');

	if (context) {
		context.clearRect(0, 0, 256, 256);
		context.fillStyle = '#ffffff';
		context.font = '800 142px Inter, sans-serif';
		context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
		context.lineWidth = 10;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.strokeText(String(value), 128, 138);
		context.fillText(String(value), 128, 138);
	}

	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;

	return new MeshStandardMaterial({
		color: accent.clone().multiplyScalar(0.58),
		map: texture,
		roughness: 0.55,
		metalness: 0.08,
		emissive: accent.clone().multiplyScalar(0.12),
		emissiveIntensity: 0.45,
		flatShading: true,
		side: DoubleSide,
	});
}

function groupPolyhedron(source: BufferGeometry): BufferGeometry {
	const position = source.attributes['position'];
	const triangles: { points: number[]; normal: Vector3; distance: number }[] = [];

	for (let offset = 0; offset < position.count; offset += 3) {
		const points = [0, 1, 2].flatMap((index) => [
			position.getX(offset + index),
			position.getY(offset + index),
			position.getZ(offset + index),
		]);
		const a = new Vector3(points[0], points[1], points[2]);
		const b = new Vector3(points[3], points[4], points[5]);
		const c = new Vector3(points[6], points[7], points[8]);
		const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();

		triangles.push({ points, normal, distance: normal.dot(a) });
	}

	const groups: { normal: Vector3; distance: number; triangles: number[][] }[] = [];
	for (const triangle of triangles) {
		let group = groups.find((item) => item.normal.dot(triangle.normal) > 0.999 && Math.abs(item.distance - triangle.distance) < 0.001);
		if (!group) {
			group = { normal: triangle.normal, distance: triangle.distance, triangles: [] };
			groups.push(group);
		}
		group.triangles.push(triangle.points);
	}

	const geometry = new BufferGeometry();
	const positions: number[] = [];
	groups.forEach((group) => {
		const start = positions.length / 3;
		group.triangles.forEach((points) => positions.push(...points));
		geometry.addGroup(start, group.triangles.length * 3, geometry.groups.length);
	});
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();

	return geometry;
}

function addFaceGroups(geometry: BufferGeometry, values: (string | number)[], accent: Color): MeshStandardMaterial[] {
	const groups = geometry.groups.length
		? geometry.groups.map((group) => ({ ...group }))
		: [{ start: 0, count: geometry.index?.count ?? geometry.attributes['position'].count, materialIndex: 0 }];
	const materials: MeshStandardMaterial[] = [];

	geometry.clearGroups();

	if (!geometry.attributes['uv']) {
		const position = geometry.attributes['position'];
		const uv = new Float32Array(position.count * 2);

		groups.forEach((group) => {
			const indices = geometry.index;
			const vertices = Array.from({ length: group.count }, (_, offset) => {
				const vertex = group.start + offset;

				return indices ? indices.getX(vertex) : vertex;
			});
			const xs = vertices.map((vertex) => position.getX(vertex));
			const ys = vertices.map((vertex) => position.getY(vertex));
			const minX = Math.min(...xs);
			const maxX = Math.max(...xs);
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);

			vertices.forEach((vertex) => {
				uv[vertex * 2] = (position.getX(vertex) - minX) / Math.max(0.0001, maxX - minX);
				uv[vertex * 2 + 1] = (position.getY(vertex) - minY) / Math.max(0.0001, maxY - minY);
			});
		});

		geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
	}

	groups.forEach((group, index) => {
		const value = values[index % values.length];
		geometry.addGroup(group.start, group.count, index);
		materials.push(faceMaterial(value, accent));
	});

	return materials;
}

function trianglePrism(): BufferGeometry {
	const positions = [
		// front triangle
		-0.95, -0.75, 0.6, 0.95, -0.75, 0.6, 0, 0.95, 0.6,
		// back triangle
		0, 0.95, -0.6, 0.95, -0.75, -0.6, -0.95, -0.75, -0.6,
		// left side
		-0.95, -0.75, 0.6, 0, 0.95, 0.6, 0, 0.95, -0.6,
		-0.95, -0.75, 0.6, 0, 0.95, -0.6, -0.95, -0.75, -0.6,
		// right side
		0.95, -0.75, 0.6, 0, 0.95, 0.6, 0, 0.95, -0.6,
		0.95, -0.75, 0.6, 0, 0.95, -0.6, 0.95, -0.75, -0.6,
		// bottom
		-0.95, -0.75, 0.6, 0.95, -0.75, 0.6, 0.95, -0.75, -0.6,
		-0.95, -0.75, 0.6, 0.95, -0.75, -0.6, -0.95, -0.75, -0.6,
	];
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();
	for (let index = 0; index < 5; index += 1) {
		geometry.addGroup(index * 6, 6, index);
	}

	return geometry;
}

function bipyramid(): BufferGeometry {
	const positions: number[] = [];
	const ring = Array.from({ length: 5 }, (_, index) => {
		const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;

		return [Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95];
	});
	const top = [0, 1.18, 0];
	const bottom = [0, -1.18, 0];

	for (let index = 0; index < 5; index += 1) {
		const next = ring[(index + 1) % 5];
		positions.push(...top, ...ring[index], ...next);
		positions.push(...bottom, ...next, ...ring[index]);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();
	for (let index = 0; index < 10; index += 1) {
		geometry.addGroup(index * 3, 3, index);
	}

	return geometry;
}

function polygonPrism(sides: number): BufferGeometry {
	const positions: number[] = [];
	const radius = 1.05;
	const depth = 0.62;
	const ring = Array.from({ length: sides }, (_, index) => {
		const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;

		return [Math.cos(angle) * radius, Math.sin(angle) * radius];
	});

	for (let index = 0; index < sides; index += 1) {
		const [x, y] = ring[index];
		const [nx, ny] = ring[(index + 1) % sides];
		positions.push(x, y, depth, nx, ny, depth, nx, ny, -depth);
		positions.push(x, y, depth, nx, ny, -depth, x, y, -depth);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();
	for (let index = 0; index < sides; index += 1) {
		geometry.addGroup(index * 6, 6, index);
	}

	return geometry;
}

function buildGeometry(sides: number): { geometry: BufferGeometry; values: number[] } {
	switch (sides) {
		case 2:
			return { geometry: new CylinderGeometry(1.25, 1.25, 0.28, 32, 1, false), values: [1, 2, 1] };
		case 3:
			return { geometry: trianglePrism(), values: [1, 2, 3, 1, 2] };
		case 4:
			return { geometry: groupPolyhedron(new TetrahedronGeometry(1.35)), values: [1, 2, 3, 4] };
		case 6:
			return { geometry: new BoxGeometry(1.35, 1.35, 1.35), values: [1, 2, 3, 4, 5, 6] };
		case 8:
			return { geometry: groupPolyhedron(new OctahedronGeometry(1.35)), values: [1, 2, 3, 4, 5, 6, 7, 8] };
		case 10:
			return { geometry: bipyramid(), values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
		case 12:
			return { geometry: groupPolyhedron(new DodecahedronGeometry(1.3)), values: Array.from({ length: 12 }, (_, index) => index + 1) };
		case 20:
			return { geometry: groupPolyhedron(new IcosahedronGeometry(1.35)), values: Array.from({ length: 20 }, (_, index) => index + 1) };
		case 5:
		case 7:
		case 9:
		case 11:
		case 13:
		case 14:
		case 15:
		case 16:
		case 17:
		case 18:
		case 19:
			return { geometry: polygonPrism(sides), values: Array.from({ length: sides }, (_, index) => index + 1) };
		default:
			return { geometry: new SphereGeometry(1.35, 12, 8), values: [] };
	}
}

function faceNormal(geometry: BufferGeometry, groupIndex: number): Vector3 {
	const group = geometry.groups[groupIndex] ?? geometry.groups[0];
	const position = geometry.attributes['position'];
	const index = geometry.index;
	const offset = group?.start ?? 0;
	const read = (vertex: number) => {
		const i = index ? index.getX(vertex) : vertex;

		return new Vector3(position.getX(i), position.getY(i), position.getZ(i));
	};
	const a = read(offset);
	const b = read(offset + 1);
	const c = read(offset + 2);

	return b.sub(a).cross(c.sub(a)).normalize();
}

export class DiceScene {
	private readonly host: HTMLElement;
	private readonly accent: Color;
	private readonly renderer: WebGLRenderer;
	private readonly scene = new Scene();
	private readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
	private readonly group = new Group();
	private current?: DiceBuild;
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
		this.camera.position.set(3.2, 2.1, 5.2);
		this.camera.lookAt(0, 0, 0);
		this.scene.add(new AmbientLight(0xffffff, 0.55));
		const light = new DirectionalLight(0xffd6f4, 3.4);
		light.position.set(-3, 5, 4);
		this.scene.add(light);
		const rim = new DirectionalLight(0x22e0ff, 2.2);
		rim.position.set(4, -2, -3);
		this.scene.add(rim);
		const point = new DirectionalLight(0xff8ad4, 1.3);
		point.position.set(2, 3, 5);
		this.scene.add(point);
		this.scene.add(this.group);
		this.resize();
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	setSides(sides: number, labels?: (string | number)[]): void {
		const labelKey = labels?.join('|') ?? '';

		if (this.sides === sides && this.labelKey === labelKey && this.current) {
			return;
		}

		this.sides = sides;
		this.labelKey = labelKey;
		if (this.current) {
			this.group.remove(this.current.mesh, this.current.edges);
			this.current.geometry.dispose();
		}

		const { geometry, values } = buildGeometry(sides);
		const faceValues = labels?.length ? labels : values.length ? values : [1];
		const materials = addFaceGroups(geometry, faceValues, this.accent);
		const mesh = new Mesh(geometry, materials);
		const edges = new LineSegments(
			new EdgesGeometry(geometry),
			new LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.9 }),
		);

		mesh.castShadow = false;
		mesh.receiveShadow = false;
		this.group.add(mesh, edges);
		this.current = { geometry, values, mesh, edges };
		this.resize();
	}

	roll(result: number): void {
		if (!this.current) {
			return;
		}

		const groups = this.current.geometry.groups.length;
		const index = Math.max(0, Math.min(groups - 1, (result - 1) % groups));
		const normal = faceNormal(this.current.geometry, index);
		this.target = new Quaternion().setFromUnitVectors(normal, new Vector3(0.95, 0.55, 1).normalize());
		this.spinAxis = new Vector3(Math.random() - 0.5, Math.random() + 0.7, Math.random() - 0.5).normalize();
		this.rollStarted = performance.now();
		this.rolling = true;
	}

	private loop(now: number): void {
		if (this.disposed) {
			return;
		}

		if (this.current) {
			if (this.rolling) {
				const elapsed = now - this.rollStarted;

				if (elapsed < 850) {
					this.current.mesh.rotateOnWorldAxis(this.spinAxis, 0.22);
					this.current.edges.rotateOnWorldAxis(this.spinAxis, 0.22);
				} else {
					this.current.mesh.quaternion.slerp(this.target, 0.18);
					this.current.edges.quaternion.copy(this.current.mesh.quaternion);

					if (this.current.mesh.quaternion.angleTo(this.target) < 0.015) {
						this.current.mesh.quaternion.copy(this.target);
						this.current.edges.quaternion.copy(this.target);
						this.rolling = false;
					}
				}
			} else {
				this.current.mesh.rotation.y += 0.002;
				this.current.edges.rotation.copy(this.current.mesh.rotation);
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
		this.current?.geometry.dispose();
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}
