from PIL import Image
import os
import sys

class ImageConstructor:
    #format = "%(z)d.%(x)d.%(y)d.jpg"
    format = "img-z%(z)d.x%(x)d.y%(y)d.jpg"

    def __init__(self, src, target):
        self.src = src
        self.target = target

        self.size = 256
        self.size2 = 2 * self.size

    def start(self):
        self._split()

        level = 0
        while True:
            total = self._merge(level)
            if total == 1:
                break
            level += 1

        print "done."
        

    def _split(self):
        size = self.size
        target = self.target

        im = Image.open(self.src)
        w, h = im.size
        
        print "Image size:", w, h
        print "Initial image splitting.."
        
        y = 0
        py = 0
        while True:
            if y > h:
                break
        
            x = 0
            px = 0
            while True:
                if x > w:
                    break
        
                tx = x + size
                ty = y + size
        
                if tx > w:
                    tx = w
                if ty > h:
                    ty = h
        
                fname = os.path.join(target, self.format % 
                                             {'z': 0, 'x': px, 'y': py})
                segment = im.crop((x, y, tx, ty))
                segment.save(fname)
    
                print "-", fname
        
                x += size
                px += 1
        
            y += size
            py += 1

    def _merge(self, level):
        print "Merging images on level %d.." % level

        size = self.size
        size2 = self.size2
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
    src = sys.argv[1]
    target = sys.argv[2]
    ic = ImageConstructor(src, target)    
    ic.start()

