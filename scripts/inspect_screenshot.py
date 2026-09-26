from PIL import Image
import numpy as np

im = Image.open("artifacts/screenshots/desktop_000_hero.png")
arr = np.array(im).astype(np.float32) / 255.0
h, w, c = arr.shape

# Let's inspect rows around y = int(h * 0.30) (above the orange disc)
y_sample = int(h * 0.32)
row = arr[y_sample, :, :3]
lums = 0.2126 * row[:, 0] + 0.7152 * row[:, 1] + 0.0722 * row[:, 2]

# Can body columns
can_cols = []
for x in range(w):
    # If not background (background is ~0.98)
    if row[x, 0] < 0.95 or row[x, 1] < 0.95:
        can_cols.append((x, lums[x]))

if can_cols:
    xs = [c[0] for c in can_cols if c[0] > 1000] # Ignore text on left
    ls = [c[1] for c in can_cols if c[0] > 1000]
    print(f"At y={y_sample} (above disc), can spans x in [{min(xs)}, {max(xs)}] (width {max(xs)-min(xs)})")
    print(f"Mean luminance of can body above disc: {np.mean(ls):.4f}")
    print(f"Fraction of can body pixels with L >= 0.40: {np.mean(np.array(ls) >= 0.40):.2%}")
