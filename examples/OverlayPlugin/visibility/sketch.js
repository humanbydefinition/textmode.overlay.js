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
	fontSize: 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(sourceCanvas);
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add();
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

function label(text, x, y, color = [140, 160, 190]) {
	t.push();
	t.printAlign('left', 'top');
	t.charColor(...color);
	t.print(text, x, y);
	t.pop();
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
	const left = -Math.floor(t.grid.cols / 2);
	const top = -Math.floor(t.grid.rows / 2);
	label('OVERLAYPLUGIN.VISIBILITY', left + 3, top + 3, [245, 158, 11]);
	label('CLICK: HIDE / SHOW', left + 3, top + 5);
});

t.mouseClicked(() => t.overlay.toggle());
t.windowResized(() => {
	resizeSource();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
});
