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
	fontSize: 16,
	plugins: [OverlayPlugin],
});
const labelLayer = t.layers.add();
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
	source = t.overlay.setTarget(targets[index]);
	source
		.characters(index === 0 ? ' .-=+#@' : ' .,:irsXA#@')
		.charColorMode('sampled')
		.cellColorMode('fixed');
}

function label(text, x, y, color = [140, 160, 190]) {
	t.push();
	t.printAlign('left', 'top');
	t.charColor(...color);
	t.print(text, x, y);
	t.pop();
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
	const left = -Math.floor(t.grid.cols / 2);
	const top = -Math.floor(t.grid.rows / 2);
	label('OVERLAYPLUGIN.RETARGET', left + 3, top + 3, [94, 234, 212]);
	label(`CLICK: TARGET ${active + 1}`, left + 3, top + 5);
});

t.mouseClicked(() => activate(1 - active));
t.windowResized(() => {
	resizeTargets();
	paintTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
});
