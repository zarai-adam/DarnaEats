"""Generates the app's original placeholder brand assets (no third-party art).

A terracotta tile with a cream house-and-bowl mark. Run: python3 scripts/generate-assets.py
Pure standard library (zlib) so it works anywhere.
"""
import struct
import zlib
from pathlib import Path

TERRACOTTA = (198, 93, 58)
CREAM = (255, 248, 237)
OLIVE = (111, 125, 69)


def png(path: Path, w: int, h: int, pixel):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(pixel(x, y))
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    path.write_bytes(data)


def mark(size, bg, fg, accent, transparent_bg=False):
    s = size
    def inside_house(x, y):
        # roof triangle + body square, centred
        cx = s / 2
        top, roof_base, bottom = s * 0.22, s * 0.45, s * 0.78
        half = s * 0.30
        if top <= y <= roof_base:
            t = (y - top) / (roof_base - top)
            return abs(x - cx) <= half * t
        if roof_base < y <= bottom:
            return abs(x - cx) <= half * 0.8
        return False
    def in_bowl(x, y):
        cx, cy, r = s / 2, s * 0.60, s * 0.14
        return y >= cy and (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    def pixel(x, y):
        if in_bowl(x, y):
            return (*accent, 255)
        if inside_house(x, y):
            return (*fg, 255)
        return (0, 0, 0, 0) if transparent_bg else (*bg, 255)
    return pixel


out = Path(__file__).resolve().parent.parent / 'assets'
out.mkdir(exist_ok=True)
png(out / 'icon.png', 512, 512, mark(512, TERRACOTTA, CREAM, OLIVE))
png(out / 'adaptive-icon.png', 512, 512, mark(512, TERRACOTTA, CREAM, OLIVE, transparent_bg=True))
png(out / 'splash.png', 512, 512, mark(512, CREAM, TERRACOTTA, OLIVE, transparent_bg=True))
png(out / 'favicon.png', 48, 48, mark(48, TERRACOTTA, CREAM, OLIVE))
png(out / 'notification-icon.png', 96, 96, mark(96, (0, 0, 0), (255, 255, 255), (255, 255, 255), transparent_bg=True))
print('assets generated in', out)
