/**
 * @title OverlayPlugin.video
 * @author humanbydefinition
 */

const feed = document.createElement('canvas');
const feedContext = feed.getContext('2d');
const video = document.createElement('video');
video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover';
document.body.append(video);

const t = textmode.create({
	width: window.innerWidth,
	height: window.innerHeight,
	fontSize: window.innerWidth < 700 ? 8 : 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(video);
source.characters(' .,:;irsXA253hMHGS#9B&@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add({ fontSize: window.innerWidth < 700 ? 8 : 16 });

function resizeFeed() {
	feed.width = window.innerWidth;
	feed.height = window.innerHeight;
}

function paintFeed() {
	const width = feed.width;
	const height = feed.height;
	const phase = t.frameCount * 0.018;
	feedContext.fillStyle = '#030712';
	feedContext.fillRect(0, 0, width, height);
	for (let index = 0; index < 7; index++) {
		const y = height * (0.18 + index * 0.11);
		const shift = Math.sin(phase + index * 0.8) * width * 0.12;
		feedContext.fillStyle = index % 2 ? '#22d3ee' : '#fb7185';
		feedContext.fillRect(width * 0.18 + shift, y, width * 0.56, height * 0.045);
	}
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

resizeFeed();
paintFeed();
video.srcObject = feed.captureStream(30);
video.play().catch(() => undefined);

t.draw(() => {
	paintFeed();
	t.clear();
	t.image(t.overlay.source, t.grid.cols, t.grid.rows);
});

labelLayer.draw(() => {
	t.clear();
	drawLabel([
		['OVERLAYPLUGIN.VIDEO', [120, 240, 180]],
		['------------------------------------', [70, 100, 140]],
		['CONCEPT: VIDEO AS OVERLAY TARGET', [140, 210, 255]],
		['A 30 fps canvas stream feeds a video.', [140, 160, 190]],
		['Video frames drive the character grid.', [140, 160, 190]],
		['------------------------------------', [70, 100, 140]],
		[`VIDEO: ${video.paused ? 'PAUSED' : 'PLAYING'}`, [140, 255, 200]],
		[`TIME: ${video.currentTime.toFixed(1)}S`, [140, 255, 200]],
	]);
});

t.windowResized(() => {
	resizeFeed();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
	const size = window.innerWidth < 700 ? 8 : 16;
	t.fontSize(size);
	for (const layer of t.layers.all) layer.fontSize(size);
});
