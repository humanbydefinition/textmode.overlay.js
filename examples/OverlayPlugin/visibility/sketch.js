/**
 * @title OverlayPlugin.visibility
 * @author humanbydefinition
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
source
	.characters('  :-=+*#%@')
	.charColorMode('fixed')
	.charColor(240, 119, 166)
	.cellColorMode('fixed')
	.cellColor(24, 16, 47);
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });

function resizeTargets() {
	target.width = window.innerWidth;
	target.height = window.innerHeight;
	const w = target.width;
	const h = target.height;
	context.fillStyle = '#18102f';
	context.fillRect(0, 0, w, h);
	context.fillStyle = '#f077a6';
	context.font = `bold ${Math.floor(Math.min(h * 0.4, w * 0.37))}px monospace`;
	context.textAlign = 'center';
	context.fillText('TEXT', w * 0.5, h * 0.68, w * 0.88);
	// Replace blended edge pixels with either the text or background color.
	const pixels = context.getImageData(0, 0, w, h);
	for (let i = 0; i < pixels.data.length; i += 4) {
		const isText = pixels.data[i] >= 132;
		pixels.data[i] = isText ? 240 : 24;
		pixels.data[i + 1] = isText ? 119 : 16;
		pixels.data[i + 2] = isText ? 166 : 47;
	}
	context.putImageData(pixels, 0, 0);
}
resizeTargets();

const button = document.createElement('button');
button.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:10;padding:12px';
document.body.append(button);
function updateButton() {
	button.textContent = t.overlay.isVisible() ? 'Show original' : 'Show textmode';
}
button.addEventListener('click', () => {
	t.overlay.toggle();
	updateButton();
});
updateButton();
t.draw(() => {
	t.background(24, 16, 47);
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
		['OVERLAYPLUGIN.VISIBILITY', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['COMPARE ORIGINAL AND OUTPUT', [140, 210, 255]],
		['The button stays outside the overlay.', [140, 160, 190]],
		['Sampling continues while it is hidden.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		['USE THE BUTTON TO SWITCH VIEWS', [255, 200, 80]],
	]);
});

t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
