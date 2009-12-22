#JPEG_ROOT=/Library/Frameworks/UnixImageIO.framework/Versions/Current/unix/
JPEG_ROOT=/usr
CFLAGS=-I$(JPEG_ROOT)/include
LDFLAGS=-L$(JPEG_ROOT)/lib -ljpeg -lm

all : split

split : split.c
	gcc -o $@ $? $(CFLAGS) $(LDFLAGS)

# vim: set noexpandtab:
