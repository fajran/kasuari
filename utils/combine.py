from PIL import Image
import os

size = 256
target = "target"

def combine(src, ix, iy, ox, oy):
    img = Image.open(src)

    iw, ih = img.size

    last = [0, 0, 0, 0]

    h = size - oy
    y = 0
    py = 0
    while True:
        if y >= ih:
            break
        w = size - ox
        x = 0
        px = 0

        y2 = y + h
        if y2 > ih:
            y2 = ih
        h = y2 - y

        while True:
            if x >= iw:
                break

            x2 = x + w
            if x2 > iw:
                x2 = iw
            w = x2 - x

            segment = img.crop((x, y, x+w, y+h))

            fname = os.path.join(target, "0.%d.%d.jpg" % (ix+px, iy+py))
            if os.path.isfile(fname):
                timg = Image.open(fname)
            else:
                timg = Image.new('RGB', (size, size))

            tx = (ox + x) % size
            ty = (oy + y) % size

            timg.paste(segment, (tx, ty, tx+w, ty+h))
            timg.save(fname)

            last = (ix+px, iy+py, tx+w, ty+h)

            print "Saved to:", px, py, '=>', ix+px, iy+py, 'segment: from:',  x, y, x+w, y+h, 'to:', tx, ty, tx+w, ty+h, 'w,h:', w, h
            x += w
            w = size
            px += 1

        y += h
        h = size
        py += 1

    return last

