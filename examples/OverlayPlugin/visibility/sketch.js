/**
 * @title OverlayPlugin.visibility
 * @author humanbydefinition
 */

const sourceCanvas = document.createElement('canvas');
const context = sourceCanvas.getContext('2d');
sourceCanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
document.body.append(sourceCanvas);

const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(sourceCanvas, { pointerEvents: 'auto' });
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });
let lastToggleFrame = 0;

function resizeSource() {
	sourceCanvas.width = window.innerWidth;
	sourceCanvas.height = window.innerHeight;
}

function paintSource() {
	const width = sourceCanvas.width;
	const height = sourceCanvas.height;
	context.fillStyle = '#111827';
	context.fillRect(0, 0, width, height);
	const gap = Math.max(36, Math.floor(width / 16));
	for (let x = -gap; x < width + gap; x += gap) {
		context.fillStyle = (x / gap) % 2 ? '#f59e0b' : '#2563eb';
		context.fillRect(x + (t.frameCount % gap), 0, gap * 0.45, height);
	}
}

function drawLabel(lines) {
	const { cols, rows } = labelLayer.grid;
	const [left, top] = [-Math.floor(cols / 2), -Math.floor(rows / 2)];
	const width = Math.max(...lines.map(([text]) => [...text].length)) + 2;
	t.push();
	t.translate(left + (width + 4) / 2, top + (lines.length + 5) / 2);
	t.cellColor(6, 10, 22);
	t.rect(width, lines.length + 2);
	t.pop();
	t.printAlign('left', 'top');
	lines.forEach(([text, color], i) => {
		t.charColor(color[0], color[1], color[2]);
		t.print(text, left + 3, top + 3 + i);
	});
}

resizeSource();
t.draw(() => {
	paintSource();
	if (t.frameCount - lastToggleFrame >= 180) {
		lastToggleFrame = t.frameCount;
		t.overlay.toggle();
	}
	t.clear();
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.VISIBILITY', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['CONCEPT: HIDE OR SHOW THE OUTPUT', [140, 210, 255]],
		['Sampling continues while hidden.', [140, 160, 190]],
		['Output toggles every 180 frames.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`OUTPUT: ${t.overlay.isVisible() ? 'VISIBLE' : 'HIDDEN'}`, [140, 255, 200]],
		['CLICK: HIDE / SHOW', [255, 200, 80]],
	]);
});

t.mouseClicked(() => t.overlay.toggle());
t.windowResized(() => {
	resizeSource();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	for (const layer of t.layers.all) layer.fontSize(size);
});
