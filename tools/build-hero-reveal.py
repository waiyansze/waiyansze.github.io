"""Build assets/hero-flowers-reveal.webp from Wai's sketch and its Procreate time-lapse.

For every pixel of ink in the finished drawing we find the last time-lapse frame
in which it was still paper: that is when it was (finally) drawn. Undone and
redrawn marks therefore take their redrawn time. The result is one opaque image:
  red   = when the pixel is drawn (1–255, 0 = no ink)
  green = how much ink it holds (anti-aliased alpha from the full-size sketch)
  blue  = part (low 3 bits) + 128 if the pixel lies inside the vessel's hatched back
          panel, which the hero fills with a flat tone (the Systems language for tone)
Parts follow the drawing order and take tones from the Systems palette in site.js:
  0 trunk · 1 vessel · 2 stand · 3 leaves and blossoms · 4 rose and side stem ·
  5 hatching · 6 mat
The hero reveals the drawing by comparing red to the animation clock.

Usage (from repo root; needs ffmpeg, numpy, scipy, pillow):
  python3 tools/build-hero-reveal.py
"""
import subprocess, numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

SRC_PNG, SRC_MP4 = 'tools/source/flowers-sketch.png', 'tools/source/flowers-timelapse.mp4'
OUT, OUT_W = 'assets/hero-flowers-reveal.webp', 900
FIRST_FRAME = 38            # frames before this are Procreate's preview of the finished picture

# 1. Time-lapse frames (grey), dropping blank/glitch frames.
probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                        '-of', 'csv=p=0', SRC_MP4], capture_output=True, text=True).stdout.strip().split(',')
W, H = int(probe[0]), int(probe[1])
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', SRC_MP4, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W)
count = (F[:, ::4, ::4] < 128).reshape(len(F), -1).sum(1)
good, prev = [], None
for i in range(FIRST_FRAME, len(F)):
    if count[i] == 0 or (prev is not None and count[i] < .7 * prev): continue
    good.append(i); prev = count[i]

# 2. Arrival frame per pixel = last frame where it was still paper.
final_ink = F[-1] < 160
T = np.zeros((H, W), np.int32)
for k, i in enumerate(good): T[F[i] > 190] = k + 1
T = np.where(final_ink, T + 1, 0)

# 3. Pacing: mix "share of ink already down" with real time, so long pauses
#    (e.g. while a passage was undone and redrawn) don't stall the animation.
vals = np.sort(T[T > 0]); u = np.unique(vals)
share = np.searchsorted(vals, u, side='right') / len(vals)
real = (u - u.min()) / max(1, u.max() - u.min())
lut = np.zeros(T.max() + 1); lut[u] = .6 * share + .4 * real
N = lut[T]

# 4. Full-size ink alpha, resampled to the video grid, then cropped to the drawing.
im = Image.open(SRC_PNG).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
alpha = 255 - np.array(bg.convert('L').resize((W, H), Image.LANCZOS)).astype(np.float64)
ys, xs = np.nonzero(alpha > 40)
pad = 6; x0, x1, y0, y1 = xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad
# Edge pixels the video didn't count as ink borrow the time of the nearest ink.
_, (iy, ix) = distance_transform_edt(T == 0, return_indices=True)
Nfill = N[iy, ix]
crop = lambda a: a[y0:y1 + 1, x0:x1 + 1]
t8 = np.clip(np.round(1 + crop(Nfill) * 254), 1, 255)
a8 = crop(alpha)
a8[a8 < 12] = 0
scale = OUT_W / (x1 - x0 + 1); OUT_H = round((y1 - y0 + 1) * scale)
t_img = Image.fromarray(np.where(a8 > 0, t8, 0).astype(np.uint8)).resize((OUT_W, OUT_H), Image.NEAREST)
# Ink alpha straight from the full-size sketch (sharper than the video-sized copy).
fx, fy = im.size[0] / W, im.size[1] / H
full = 255 - np.array(bg.convert('L')).astype(np.float64)
box = (round(x0 * fx), round(y0 * fy), round((x1 + 1) * fx), round((y1 + 1) * fy))
a_img = Image.fromarray(full.astype(np.uint8)).crop(box).resize((OUT_W, OUT_H), Image.LANCZOS)
a_img = a_img.point(lambda v: 0 if v < 12 else v)
t_img = Image.fromarray(np.where(np.array(t_img) > 0, np.array(t_img), 0).astype(np.uint8))
# pixels with ink but no time (outside the video's ink mask) take the nearest time
tm = np.array(t_img); am = np.array(a_img)
_, (jy, jx) = distance_transform_edt(tm == 0, return_indices=True)
tm = np.where(am > 0, tm[jy, jx], 0).astype(np.uint8); t_img = Image.fromarray(tm)
# Parts, from draw time (1–255) and position. Boundaries were read off the time map.
from scipy import ndimage as ndi
tt, am = tm.astype(int), np.array(a_img)
yy = np.arange(OUT_H)[:, None] / OUT_H + np.zeros((1, OUT_W))
xx = np.zeros((OUT_H, 1)) + np.arange(OUT_W)[None, :] / OUT_W
part = np.zeros((OUT_H, OUT_W), np.uint8)
part[tt < 32] = 1                                               # vessel
part[(tt >= 32) & (tt < 64)] = 2                                # stand
part[(tt >= 32) & (tt < 64) & (yy < .73)] = 0                   # …except the trunk's base inside the vessel
part[(tt >= 64) & (tt < 112)] = 0                               # trunk
part[(tt >= 112) & (tt < 160)] = 3                              # leaves and blossoms
part[(tt >= 160) & (tt < 192)] = 0                              # late trunk touches…
part[(tt >= 160) & (tt < 192) & (xx >= .472)] = 4               # …and the rose and side stem
part[(tt > 0) & (tt < 192) & (yy >= .745) & np.isin(part, (0, 1))] = 2   # anything below the rim is stand
part[(tt >= 192)] = 5                                           # hatching
part[(tt >= 205) & (yy >= .77)] = 6                             # the mat
# The hatched back panel: the one closed shape in the vessel outline.
struct = (am > 60) & (tt > 0) & (tt < 64)
closed = ndi.binary_closing(ndi.binary_dilation(struct, iterations=2), iterations=4)
lab, n = ndi.label(~closed)
sizes = ndi.sum(np.ones_like(lab), lab, range(n + 1))
cands = [i for i in range(1, n + 1) if i != lab[0, 0] and sizes[i] > 4000]
panel = np.isin(lab, cands)
panel = ndi.binary_dilation(panel, iterations=3) & ~(struct & (am > 200))   # tuck under the outline
blue = part + panel.astype(np.uint8) * 128
rgb = Image.merge('RGB', (t_img, a_img, Image.fromarray(blue)))
print('panel px', int(panel.sum()), 'parts', np.bincount(part[am > 0], minlength=7).tolist())
rgb.save(OUT, lossless=True, method=6)
print(f'{OUT}: {OUT_W}×{OUT_H}; video crop x {x0}–{x1}, y {y0}–{y1}; frames used {len(good)}')
