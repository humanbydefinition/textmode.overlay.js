/**
 * @title OverlayPlugin.retarget
 * @author humanbydefinition
 */

const targets = [document.createElement('canvas'), document.createElement('canvas')];
const contexts = targets.map((target) => target.getContext('2d'));
for (const target of targets) {
	target.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
	document.body.append(target);
}
const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });
let active = 0;
function resizeTargets() {
	for (const target of targets) {
		target.width = window.innerWidth;
		target.height = window.innerHeight;
	}
}
function bindTarget() {
	targets[0].style.display = active === 0 ? 'block' : 'none';
	targets[1].style.display = active === 1 ? 'block' : 'none';
	const source = t.overlay.setTarget(targets[active]);
	source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed').cellColor(6, 10, 22);
}
resizeTargets();
bindTarget();
for (const target of targets) {
	target.addEventListener('click', () => {
		active = 1 - active;
		bindTarget();
	});
}
t.draw(() => {
	const w = targets[0].width;
	const h = targets[0].height;
	contexts[0].fillStyle = '#073d38';
	contexts[0].fillRect(0, 0, w, h);
	contexts[0].fillStyle = '#7af0bb';
	contexts[0].fillRect(w * 0.4, h * 0.35, w * 0.45, h * 0.35);
	contexts[1].fillStyle = '#341849';
	contexts[1].fillRect(0, 0, w, h);
	contexts[1].fillStyle = '#ffb7eb';
	contexts[1].beginPath();
	contexts[1].arc(w * 0.65, h * 0.55, Math.min(w, h) * 0.23, 0, Math.PI * 2);
	contexts[1].fill();
	t.background(6, 10, 22);
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
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
		['OVERLAYPLUGIN.RETARGET', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['SWAP CANVAS TARGETS', [140, 210, 255]],
		['setTarget() replaces the source.', [140, 160, 190]],
		['Clicks pass through to the target.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`TAP: SWITCH TARGET ${active + 1}`, [255, 200, 80]],
	]);
});

t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
