from PIL import Image
import sys
import os

class ImageSplitter:
    format = "%(z)d.%(x)d.%(y)d.jpg"

    def __init__(self, target, images=(())):
        self.target = target
        self.size = 256
        self.images = images

    def start(self):
        self._splitImages()

        level = 0
        while True:
            total = self._merge(level)
            if total == 1:
                break
            level += 1

        print "done."

    def _splitImages(self):
        print "Splitting images.."

        dix = {}
        diy = {}
        dox = {}
        doy = {}

        rows = len(self.images)
        for imgy in range(rows):
            cols = len(self.images[imgy])
            for imgx in range(cols):
                src = self.images[imgy][imgx]

                ix = dix.get(imgx, 0)
                iy = diy.get(imgy, 0)
                ox = dox.get(imgx, 0)
                oy = doy.get(imgy, 0)

                lix, liy, lox, loy = self._split(src, ix, iy, ox, oy)

                if lox == self.size:
                    lox = 0
                    lix += 1
                if loy == self.size:
                    loy = 0
                    liy += 1

                dix[imgx+1] = lix
                diy[imgy+1] = liy
                dox[imgx+1] = lox
                doy[imgy+1] = loy

    def _split(self, src, ix, iy, ox, oy):
        print "      split:", src, ix, iy, ox, oy
        size = self.size
        target = self.target

        img = Image.open(src)
        iw, ih = img.size

        print "-", src
        print "  - size:", iw, ih
    
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
    
                fname = os.path.join(target, self.format % 
                                             {'z': 0, 'x': ix+px, 'y': iy+py})
                if os.path.isfile(fname):
                    timg = Image.open(fname)
                else:
                    timg = Image.new('RGB', (size, size))
    
                tx = (ox + x) % size
                ty = (oy + y) % size
    
                timg.paste(segment, (tx, ty, tx+w, ty+h))
                timg.save(fname)
    
                last = (ix+px, iy+py, tx+w, ty+h)

                print '  -', fname
    
                # print "        Saved to:", px, py, '=>', ix+px, iy+py, 'segment: from:',  x, y, x+w, y+h, 'to:', tx, ty, tx+w, ty+h, 'w,h:', w, h
                x += w
                w = size
                px += 1
    
            y += h
            h = size
            py += 1
    
        return last

    def _merge(self, level):
        print "Merging images on level %d.." % level

        size = self.size
        size2 = size * 2
        target = self.target
    
        total = 0
        
        y = 0
        py = 0
        while True:
            x = 0
            px = 0
        
            first = True
            while True:
                xlist = [x, x+1]
                ylist = [y, y+1]
        
                im = Image.new("RGB", (size2, size2))
        
                cnt = 0
                for ix in [0,1]:
                    for iy in [0,1]:
                        sx, sy = xlist[ix], ylist[iy]
                        fname = os.path.join(target, self.format %
                                                     {'z': level, 
                                                      'x': sx, 'y': sy})
                        if os.path.isfile(fname):
                            ims = Image.open(fname)
                            w, h = ims.size
                            im.paste(ims, (ix * size, iy * size, 
                                           ix * size + w, iy * size + h))
                            cnt += 1
        
                if cnt > 0:
                    fname = os.path.join(target, self.format % 
                                                 {'z': level + 1,
                                                  'x': px, 'y': py})
                    resized = im.resize((size, size))
                    resized.save(fname)
                    total += 1
    
                    print "-", fname
        
                if cnt == 0:
                    break
        
                px += 1
                x += 2
                first = False
        
            if first and cnt == 0:
                break
        
            py += 1
            y += 2
    
        return total

if __name__ == '__main__':
    target = sys.argv[1]

    images = []
    rows = []
    for img in sys.argv[2:]:
        if img != '-':
            rows.append(img)
        else:
            if len(rows) > 0:
                images.append(rows)
            rows = []

    if len(rows) > 0:
        images.append(rows)

    imgs = ImageSplitter('target', images)
    imgs.start()

