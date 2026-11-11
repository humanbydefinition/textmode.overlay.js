/**
 * @title OverlayPlugin.canvas
 * @author humanbydefinition
 */

const sourceCanvas = document.createElement('canvas');
const sourceContext = sourceCanvas.getContext('2d');
sourceCanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
document.body.append(sourceCanvas);

const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(sourceCanvas);
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });

function resizeSource() {
	sourceCanvas.width = window.innerWidth;
	sourceCanvas.height = window.innerHeight;
}

function paintSource() {
	const width = sourceCanvas.width;
	const height = sourceCanvas.height;
	const drift = Math.sin(t.frameCount * 0.025) * width * 0.05;
	const gradient = sourceContext.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, '#020617');
	gradient.addColorStop(0.55, '#0c4a6e');
	gradient.addColorStop(1, '#172554');
	sourceContext.fillStyle = gradient;
	sourceContext.fillRect(0, 0, width, height);
	sourceContext.fillStyle = '#67e8f9';
	sourceContext.fillRect(width * 0.18 + drift, height * 0.28, width * 0.26, height * 0.13);
	sourceContext.fillStyle = '#fbbf24';
	sourceContext.beginPath();
	sourceContext.arc(width * 0.7 - drift, height * 0.58, Math.min(width, height) * 0.12, 0, Math.PI * 2);
	sourceContext.fill();
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
	t.clear();
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.CANVAS', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['CONCEPT: CANVAS AS OVERLAY SOURCE', [140, 210, 255]],
		['A 2D canvas is sampled each frame.', [140, 160, 190]],
		['Sampled characters, fixed cell color.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`GRID: ${labelLayer.grid.cols} X ${labelLayer.grid.rows} CELLS`, [140, 255, 200]],
	]);
});

t.windowResized(() => {
	resizeSource();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	for (const layer of t.layers.all) layer.fontSize(size);
});
