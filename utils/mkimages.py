from PIL import Image
import sys
import os
from math import ceil

if len(sys.argv) < 3:
	print """Usage: %s <input> <output-directory>""" % sys.argv[0]
	sys.exit(1)

input = sys.argv[1]
target = sys.argv[2]
ext = input.split('.')[-1]

try:
	os.mkdir(target)
except OSError:
	pass

dim = (256, 256)

print "Reading image..",
im = Image.open(input)
print "done."

size = im.size
print "Image size:", repr(size)

def smaller(size, max):
	w, h = size
	mw, mh = max
	return w < mw and h < mh

print "Creating images.."

zoom = 0
while True:
	print "- Zoom level %d, size: %s" % (zoom, repr(size))
	print " ",

	col = int(ceil(float(size[0]) / dim[0]))
	row = int(ceil(float(size[1]) / dim[1]))

	for i in range(0, row):
		print ".",
		for j in range(0, col):
			x = j * dim[0]
			y = i * dim[0]
			box = (x, y, x+dim[0], y+dim[1])

			region = im.crop(box)
			fname = "img-z%d.x%d.y%d.%s" % (zoom, j, i, ext)
			region.save(os.path.join(target, fname))
	print

	if smaller(size, dim):
		break
	
	im = im.resize((size[0]/2, size[1]/2))
	size = im.size
	zoom += 1

print "done."
	
