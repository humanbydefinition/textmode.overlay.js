/**
 * @title OverlayPlugin.pointerEvents
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
let policy = 'none';
let receiver = 'NONE';
const button = document.createElement('button');
button.style.cssText = 'position:fixed;right:16px;top:16px;z-index:10;padding:12px';
document.body.append(button);
function bind() {
	const source = t.overlay.setTarget(target, { pointerEvents: policy });
	source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed').cellColor(18, 38, 53);
	button.textContent = `Pointer events: ${policy}`;
}
button.addEventListener('click', () => {
	policy = policy === 'none' ? 'auto' : 'none';
	bind();
});
target.addEventListener('click', () => {
	receiver = 'TARGET';
});
t.canvas.addEventListener('click', () => {
	receiver = 'OUTPUT';
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
	context.fillStyle = '#122635';
	context.fillRect(0, 0, w, h);
	context.fillStyle = '#f4d35e';
	context.beginPath();
	context.moveTo(w * 0.48, h * 0.3);
	context.lineTo(w * 0.78, h * 0.55);
	context.lineTo(w * 0.48, h * 0.8);
	context.closePath();
	context.fill();
	t.background(18, 38, 53);
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
		['OVERLAYPLUGIN.POINTEREVENTS', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['WHO RECEIVES A CLICK?', [140, 210, 255]],
		["'none' passes through to the target.", [140, 160, 190]],
		["'auto' lets the output receive it.", [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`LAST CLICK: ${receiver}`, [140, 255, 200]],
		['TAP ART; USE BUTTON TO CHANGE POLICY', [255, 200, 80]],
	]);
});
t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
