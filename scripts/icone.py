"""Génère icon-source.png (1024x1024) sans dépendance : carré arrondi violet + dé."""
import struct, zlib, sys
N = 1024
def inside_round(x, y, x0, y0, x1, y1, r):
    if x < x0 or x >= x1 or y < y0 or y >= y1: return False
    cx = min(max(x, x0 + r), x1 - r - 1); cy = min(max(y, y0 + r), y1 - r - 1)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
pips = [(380,380),(644,380),(512,512),(380,644),(644,644)]
rows = []
for y in range(N):
    row = bytearray([0])
    for x in range(N):
        if inside_round(x, y, 128, 128, 896, 896, 150):
            px = (255, 255, 255, 255)
            if not inside_round(x, y, 176, 176, 848, 848, 110): px = (91, 70, 214, 255)
            if any((x - a) ** 2 + (y - b) ** 2 <= 52 ** 2 for a, b in pips): px = (91, 70, 214, 255)
        else:
            px = (0, 0, 0, 0)
        row += bytes(px)
    rows.append(bytes(row))
raw = b''.join(rows)
def chunk(t, d):
    c = struct.pack('>I', len(d)) + t + d
    return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
open(sys.argv[1], 'wb').write(png)
