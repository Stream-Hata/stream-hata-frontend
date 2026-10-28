import { BufferGeometry, Euler, Quaternion, Vector3 } from 'three';
import { buildGeometry } from './dice-scene';

interface Face {
	points: Vector3[];
	value: string | number;
	normal: Vector3;
	center: Vector3;
}

const LIGHT = new Vector3(-0.4, 0.8, 0.6).normalize();

function triangles(geometry: BufferGeometry, start: number, count: number): Vector3[][] {
	const position = geometry.attributes['position'];
	const index = geometry.index;
	const result: Vector3[][] = [];

	for (let offset = 0; offset < count; offset += 3) {
		const vertices = [0, 1, 2].map((i) => {
			const vertex = start + offset + i;
			const actual = index ? index.getX(vertex) : vertex;

			return new Vector3(position.getX(actual), position.getY(actual), position.getZ(actual));
		});
		result.push(vertices);
	}

	return result;
}

function shade(hex: string, amount: number): string {
	const value = hex.replace('#', '');
	const number = parseInt(value.length === 3 ? value.split('').map((c) => c + c).join('') : value, 16);
	const r = Math.max(0, Math.min(255, ((number >> 16) & 255) * amount));
	const g = Math.max(0, Math.min(255, ((number >> 8) & 255) * amount));
	const b = Math.max(0, Math.min(255, (number & 255) * amount));

	return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

export class DiceFallback {
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;
	private readonly accent: string;
	private geometry?: BufferGeometry;
	private faces: Face[] = [];
	private sides = 0;
	private labels: (string | number)[] = [];
	private rotation = new Quaternion();
	private target = new Quaternion();
	private rolling = false;
	private started = 0;
	private frame = 0;
	private disposed = false;

	constructor(host: HTMLElement, accent: string) {
		this.accent = accent;
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'dice-canvas';
		this.canvas.width = 300;
		this.canvas.height = 300;
		this.canvas.style.display = 'block';
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.context = this.canvas.getContext('2d')!;
		host.replaceChildren(this.canvas);
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	setSides(sides: number, labels?: (string | number)[]): void {
		if (this.sides === sides && this.labels.join('|') === (labels?.join('|') ?? '')) {
			return;
		}

		this.sides = sides;
		this.labels = labels ?? [];
		const { geometry, values } = buildGeometry(sides);
		this.geometry = geometry;
		const faceValues = this.labels.length ? this.labels : values.length ? values : [1];
		this.faces = [];

		geometry.groups.forEach((group, index) => {
			triangles(geometry, group.start, group.count).forEach((points) => {
				const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
				const center = points.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / points.length);

				this.faces.push({
					points,
					value: faceValues[index % faceValues.length],
					normal,
					center,
				});
			});
		});
	}

	roll(result: number): void {
		const faces = this.faces.filter((face) => face.value === result || face.normal.length() > 0);
		const targetFace = faces.find((face) => String(face.value) === String(result)) ?? this.faces[0];
		if (targetFace) {
			this.target = new Quaternion().setFromUnitVectors(targetFace.normal, new Vector3(1.35, 0.9, 1).normalize());
		}
		this.started = performance.now();
		this.rolling = true;
	}

	private loop(now: number): void {
		if (this.disposed) {
			return;
		}

		if (this.rolling) {
			if (now - this.started < 850) {
				this.rotation.multiply(new Quaternion().setFromEuler(new Euler(0.06, 0.1, 0.03)));
			} else {
				this.rotation.slerp(this.target, 0.18);
				if (this.rotation.angleTo(this.target) < 0.02) {
					this.rotation.copy(this.target);
					this.rolling = false;
				}
			}
		} else {
			this.rotation.multiply(new Quaternion().setFromEuler(new Euler(0, 0.003, 0)));
		}

		this.draw();
		this.frame = requestAnimationFrame(this.loop);
	}

	private draw(): void {
		const context = this.context;
		const width = this.canvas.width;
		const height = this.canvas.height;
		context.clearRect(0, 0, width, height);
		if (!this.faces.length) {
			return;
		}

		const projected = this.faces.map((face) => {
			const points = face.points.map((point) => this.project(point));
			const normal = face.normal.clone().applyQuaternion(this.rotation);
			const depth = points.reduce((sum, point) => sum + point.z, 0) / points.length;

			return { ...face, points, normal, depth };
		}).sort((a, b) => a.depth - b.depth);

		for (const face of projected) {
			const light = 0.35 + Math.max(0, face.normal.dot(LIGHT)) * 0.85;
			context.beginPath();
			face.points.forEach((point, index) => {
				if (index === 0) context.moveTo(point.x, point.y);
				else context.lineTo(point.x, point.y);
			});
			context.closePath();
			context.fillStyle = shade(this.accent, light * 0.6);
			context.fill();
			context.strokeStyle = this.accent;
			context.lineWidth = 3;
			context.stroke();
		}

		for (const face of projected) {
			const center = this.project(face.center);
			if (face.normal.z <= 0) {
				continue;
			}
			context.font = '800 34px Inter, sans-serif';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.lineWidth = 6;
			context.strokeStyle = 'rgba(0,0,0,.7)';
			context.strokeText(String(face.value), center.x, center.y);
			context.fillStyle = '#fff';
			context.fillText(String(face.value), center.x, center.y);
		}
	}

	private project(point: Vector3): { x: number; y: number; z: number } {
		const rotated = point.clone().applyQuaternion(this.rotation);
		const perspective = 4.8 / (7 - rotated.z);
		const scale = 48 * perspective;

		return {
			x: this.canvas.width / 2 + rotated.x * scale,
			y: this.canvas.height / 2 - rotated.y * scale,
			z: rotated.z,
		};
	}

	destroy(): void {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.canvas.remove();
	}
}
