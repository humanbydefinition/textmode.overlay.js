/**
 * @title OverlayPlugin.video
 */

const feed = document.createElement('canvas');
const context = feed.getContext('2d');
const video = document.createElement('video');
video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
document.body.append(video);
const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(video);
source.characters(' .:-=+*#%@').charColorMode('sampled').cellColorMode('fixed').cellColor(7, 27, 50);
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });

function resizeTargets() {
	feed.width = window.innerWidth;
	feed.height = window.innerHeight;
}
resizeTargets();
video.srcObject = feed.captureStream(30);
video.play().catch((error) => console.error('Video playback failed:', error));
window.addEventListener('pagehide', () => {
	video.srcObject.getTracks().forEach((track) => track.stop());
});
t.draw(() => {
	const w = feed.width;
	const h = feed.height;
	context.fillStyle = '#071b32';
	context.fillRect(0, 0, w, h);
	context.fillStyle = '#41d8ca';
	for (let i = 0; i < 5; i++) {
		const x = w * (0.25 + i * 0.13);
		const height = h * (0.15 + 0.12 * Math.sin(t.frameCount * 0.04 + i));
		context.fillRect(x, h * 0.72 - height, w * 0.08, height);
	}
	t.background(7, 27, 50);
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
		['OVERLAYPLUGIN.VIDEO', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['VIDEO TO TEXT', [140, 210, 255]],
		['A canvas stream plays in a video.', [140, 160, 190]],
		['The overlay samples the video frames.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`VIDEO: ${video.paused ? 'PAUSED' : 'PLAYING'}`, [255, 200, 80]],
	]);
});

t.windowResized(() => {
	resizeTargets();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	labelLayer.fontSize(size);
});
