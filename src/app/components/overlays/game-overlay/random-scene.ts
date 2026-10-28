export class RandomWheel {
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;
	private readonly accent: string;
	private readonly host: HTMLElement;
	private labels: string[] = ['1', '2', '3'];
	private rotation = 0;
	private target = 0;
	private started = 0;
	private spinning = false;
	private result = '';
	private frame = 0;
	private disposed = false;

	constructor(host: HTMLElement, accent: string) {
		this.host = host;
		this.accent = accent;
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'random-canvas';
		this.canvas.width = 300;
		this.canvas.height = 300;
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.context = this.canvas.getContext('2d')!;
		host.replaceChildren(this.canvas);
		this.loop = this.loop.bind(this);
		this.frame = requestAnimationFrame(this.loop);
	}

	spin(label: string, result: string): void {
		this.result = result;
		const range = label.match(/^(-?\d+)\s*(?:-|\.\.|:)\s*(-?\d+)$/);
		if (range) {
			const from = Number(range[1]);
			const to = Number(range[2]);
			const count = Math.min(16, Math.max(6, to - from + 1));
			this.labels = Array.from({ length: count }, (_, index) => String(Math.round(from + ((to - from) * index) / Math.max(1, count - 1))));
		} else {
			const values = label.split('|').map((item) => item.trim()).filter(Boolean);
			this.labels = values.length ? values.slice(0, 16) : [label || '?'];
		}
		this.target = this.rotation + Math.PI * 2 * (3 + Math.random() * 2);
		this.started = performance.now();
		this.spinning = true;
	}

	private loop = (): void => {
		if (this.disposed) return;
		if (this.spinning) {
			const t = Math.min(1, (performance.now() - this.started) / 1500);
			const eased = 1 - (1 - t) ** 3;
			this.rotation += (this.target - this.rotation) * eased * 0.22;
			if (t >= 1) this.spinning = false;
		} else {
			this.rotation += 0.001;
		}
		this.draw();
		this.frame = requestAnimationFrame(this.loop);
	};

	private draw(): void {
		const ctx = this.context;
		const size = this.canvas.width;
		const center = size / 2;
		const radius = size * 0.4;
		ctx.clearRect(0, 0, size, size);
		ctx.save();
		ctx.translate(center, center);
		ctx.rotate(this.rotation);
		const count = this.labels.length;
		const colors = ['#ff2ea6', '#7c5cff', '#22e0ff', '#2ee6a8', '#ffd166'];
		for (let index = 0; index < count; index += 1) {
			const start = (Math.PI * 2 * index) / count;
			const end = (Math.PI * 2 * (index + 1)) / count;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, radius, start, end);
			ctx.closePath();
			ctx.fillStyle = colors[index % colors.length];
			ctx.globalAlpha = 0.78;
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.strokeStyle = 'rgba(15,8,23,.65)';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.save();
			ctx.rotate((start + end) / 2);
			ctx.fillStyle = '#fff';
			ctx.font = '700 15px system-ui, sans-serif';
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.fillText(this.labels[index], radius - 12, 0);
			ctx.restore();
		}
		ctx.restore();
		ctx.beginPath();
		ctx.arc(center, center, radius * 0.28, 0, Math.PI * 2);
		ctx.fillStyle = '#120b1c';
		ctx.fill();
		ctx.strokeStyle = this.accent;
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.fillStyle = '#fff';
		ctx.font = '800 30px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(this.result || '?', center, center + 2);
		ctx.beginPath();
		ctx.moveTo(center, center - radius - 4);
		ctx.lineTo(center - 9, center - radius + 12);
		ctx.lineTo(center + 9, center - radius + 12);
		ctx.closePath();
		ctx.fillStyle = this.accent;
		ctx.fill();
	}

	destroy(): void {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.canvas.remove();
	}
}
