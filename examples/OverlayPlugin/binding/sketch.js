/**
 * @title OverlayPlugin.binding
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
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });
const button = document.createElement('button');
button.style.cssText = 'position:fixed;right:16px;top:16px;z-index:10;padding:12px';
document.body.append(button);
function bind() {
	const source = t.overlay.setTarget(target);
	source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed').cellColor(32, 37, 72);
	button.textContent = 'Clear target';
}
button.addEventListener('click', () => {
	if (t.overlay.target) {
		t.overlay.clearTarget();
		button.textContent = 'Bind target';
	} else {
		bind();
	}
});
function resizeTargets() {
	target.width = window.innerWidth;
	target.height = window.innerHeight;
}
resizeTargets();
bind();
t.draw(() => {
	const w = target.width;
	const h = target.height;
	context.fillStyle = '#202548';
	context.fillRect(0, 0, w, h);
	context.fillStyle = '#ffca78';
	context.fillRect(w * 0.4, h * 0.35, w * 0.4, h * 0.3);
	t.background(32, 37, 72);
	if (t.overlay.source) t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

function drawLabel(lines) {
	const { cols, rows } = labelLayer.grid;
	const left = -Math.floor(cols / 2);
	const top = -Math.floor(rows / 2);
	const width = Math.max(...lines.map(([text]) => text.length)) + 2;
	t.push();
	t.translate(left + (width + 4) / 2, top + (lines.length + 5) / 2);
	t.cellColor(6, 10, 22);
	t.rect(width, lines.length + 2);
	t.pop();
	t.printAlign('left', 'top');
	lines.forEach(([text, color], index) => {
		t.charColor(...color);
		t.print(text, left + 3, top + 3 + index);
	});
}

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.BINDING', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['BIND AND RELEASE', [140, 210, 255]],
		['clearTarget() restores the output.', [140, 160, 190]],
		['target and source become undefined.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`TARGET: ${t.overlay.target ? 'BOUND' : 'NONE'}`, [255, 200, 80]],
	]);
});

t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
