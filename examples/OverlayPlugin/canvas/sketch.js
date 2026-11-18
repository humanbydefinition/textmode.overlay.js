/**
 * @title OverlayPlugin.canvas
 */

const target = document.createElement('canvas');
const context = target.getContext('2d');
target.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
document.body.append(target);
const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(target);
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed').cellColor(16, 20, 44);
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });

function resizeTargets() {
	target.width = window.innerWidth;
	target.height = window.innerHeight;
}
resizeTargets();

t.draw(() => {
	const w = target.width;
	const h = target.height;
	context.fillStyle = '#10142c';
	context.fillRect(0, 0, w, h);
	context.fillStyle = '#ffbd69';
	context.beginPath();
	context.arc(w * 0.68, h * 0.55, Math.min(w, h) * 0.24, 0, Math.PI * 2);
	context.fill();
	context.fillStyle = '#ec5f67';
	for (let i = 0; i < 4; i++) {
		context.fillRect(w * 0.4, h * (0.55 + i * 0.07), w * 0.55, h * 0.025);
	}
	t.background(16, 20, 44);
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

function drawLabel(lines) {
	const { cols, rows } = labelLayer.grid;
	const left = -Math.floor((cols - 1) / 2);
	const top = -Math.floor(rows / 2);
	const width = Math.max(...lines.map(([text]) => text.length)) + 2;
	t.printAlign('left', 'top');
	t.cellColor(6, 10, 22);
	t.push();
	t.translate(left + (width + 3) / 2, top + (lines.length + 5) / 2);
	t.char(' ');
	t.rect(width, lines.length + 2);
	t.pop();
	lines.forEach(([text, color], index) => {
		t.charColor(...color);
		t.print(text, left + 3, top + 3 + index);
	});
}

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.CANVAS', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['CANVAS TO TEXT', [140, 210, 255]],
		['The sunset is drawn on a 2D canvas.', [140, 160, 190]],
		['The overlay samples that canvas.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		['SOURCE: t.overlay.source', [255, 200, 80]],
	]);
});

t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
