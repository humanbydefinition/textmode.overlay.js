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
	fontSize: 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(sourceCanvas);
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add();

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
	t.clear();
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

labelLayer.draw(() => {
	t.clear();
	const left = -Math.floor(t.grid.cols / 2);
	const top = -Math.floor(t.grid.rows / 2);
	label('OVERLAYPLUGIN.CANVAS', left + 3, top + 3, [103, 232, 249]);
	label('LIVE CANVAS -> OUTPUT', left + 3, top + 5);
});

t.windowResized(() => {
	resizeSource();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
});
