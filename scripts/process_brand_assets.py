"""Remove logo background and generate rounded-full favicon assets."""
from collections import deque
from PIL import Image, ImageDraw, ImageFilter


def is_bg(r, g, b):
    avg = (r + g + b) / 3
    return (
        r >= 215
        and g >= 210
        and b >= 200
        and abs(r - g) <= 28
        and abs(g - b) <= 35
        and avg >= 220
    )


def remove_background(src_path):
    src = Image.open(src_path).convert("RGBA")
    w, h = src.size
    px = src.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    bg_mask = Image.new("L", (w, h), 0)
    bg_px = bg_mask.load()

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, _a = px[x, y]
        if not is_bg(r, g, b):
            continue
        bg_px[x, y] = 255
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))

    bg_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    out = src.copy()
    out_px = out.load()
    m = bg_mask.load()
    for y in range(h):
        for x in range(w):
            alpha_cut = m[x, y]
            if alpha_cut:
                r, g, b, a = out_px[x, y]
                new_a = max(0, int(a * (1 - alpha_cut / 255.0)))
                out_px[x, y] = (r, g, b, new_a)

    bbox = out.getbbox()
    if bbox:
        pad = 12
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        return out.crop((left, top, right, bottom))
    return out


def make_circle(img, size, bg_color=(18, 18, 20, 255)):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    draw.ellipse((0, 0, size - 1, size - 1), fill=bg_color)

    pad = int(size * 0.12)
    max_side = size - pad * 2
    lw, lh = img.size
    scale = min(max_side / lw, max_side / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    logo_r = img.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2

    canvas.paste(base, (0, 0), base)
    canvas.paste(logo_r, (ox, oy), logo_r)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.6))
    final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final.paste(canvas, (0, 0))
    final.putalpha(mask)
    return final


def main():
    # Prefer original JPG if PNG was already processed
    source = "public/logo.jpg"
    logo = remove_background(source)
    logo.save("public/logo.png", "PNG")
    print("Saved transparent logo.png", logo.size, logo.mode)

    fav512 = make_circle(logo, 512)
    fav512.save("public/favicon.png", "PNG")
    print("Saved favicon.png", fav512.size)

    icon1024 = make_circle(logo, 1024)
    icon1024.save("src/app/icon.png", "PNG")
    print("Saved src/app/icon.png", icon1024.size)

    ico_imgs = [make_circle(logo, s) for s in (16, 32, 48)]
    ico_imgs[0].save(
        "public/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=ico_imgs[1:],
    )
    print("Saved favicon.ico")

    check = Image.open("public/logo.png")
    if check.mode == "RGBA":
        data = list(check.getdata())
        transparent = sum(1 for p in data if p[3] < 10)
        print("transparent pct", round(100 * transparent / len(data), 1))


if __name__ == "__main__":
    main()
