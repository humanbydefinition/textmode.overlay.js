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
	fontSize: 16,
	plugins: [OverlayPlugin],
});
const source = t.overlay.setTarget(video);
source.characters(' .,:;irsXA253hMHGS#9B&@').charColorMode('sampled').cellColorMode('fixed');
const labelLayer = t.layers.add();

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

function label(text, x, y, color = [140, 160, 190]) {
	t.push();
	t.printAlign('left', 'top');
	t.charColor(...color);
	t.print(text, x, y);
	t.pop();
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
	const left = -Math.floor(t.grid.cols / 2);
	const top = -Math.floor(t.grid.rows / 2);
	label('OVERLAYPLUGIN.VIDEO', left + 3, top + 3, [251, 113, 133]);
	label('VIDEO READY: LATE', left + 3, top + 5);
});

t.windowResized(() => {
	resizeFeed();
	t.resizeCanvas(window.innerWidth, window.innerHeight);
});
