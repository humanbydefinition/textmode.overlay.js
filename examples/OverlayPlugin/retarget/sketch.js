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
let source;

function resizeTargets() {
	for (const target of targets) {
		target.width = window.innerWidth;
		target.height = window.innerHeight;
	}
}

function paintTargets() {
	contexts[0].fillStyle = '#042f2e';
	contexts[0].fillRect(0, 0, targets[0].width, targets[0].height);
	contexts[0].fillStyle = '#5eead4';
	contexts[0].fillRect(targets[0].width * 0.12, targets[0].height * 0.3, targets[0].width * 0.7, 110);
	contexts[1].fillStyle = '#2e1065';
	contexts[1].fillRect(0, 0, targets[1].width, targets[1].height);
	contexts[1].fillStyle = '#f0abfc';
	contexts[1].beginPath();
	contexts[1].arc(targets[1].width * 0.66, targets[1].height * 0.54, 130, 0, Math.PI * 2);
	contexts[1].fill();
}

function activate(index) {
	active = index;
	targets[0].style.display = index === 0 ? 'block' : 'none';
	targets[1].style.display = index === 1 ? 'block' : 'none';
	source = t.overlay.setTarget(targets[index], { pointerEvents: 'auto' });
	source
		.characters(index === 0 ? ' .-=+#@' : ' .,:irsXA#@')
		.charColorMode('sampled')
		.cellColorMode('fixed');
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

resizeTargets();
paintTargets();
activate(0);
t.draw(() => {
	t.clear();
	t.image(source, t.grid.cols, t.grid.rows);
});

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.RETARGET', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['CONCEPT: SWAP THE OVERLAY TARGET', [140, 210, 255]],
		['setTarget() rebinds to another canvas.', [140, 160, 190]],
		['Each target has its own character ramp.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`TARGET: ${active + 1} OF 2`, [140, 255, 200]],
		['CLICK: SWAP TARGET', [255, 200, 80]],
	]);
});

t.mouseClicked(() => activate(1 - active));
t.windowResized(() => {
	resizeTargets();
	paintTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	for (const layer of t.layers.all) layer.fontSize(size);
});
