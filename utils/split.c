#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <jpeglib.h>
#include <setjmp.h>
#include <math.h>

#define QUALITY 100

struct t_crop {
    char* fname;
    int cw;
    int ch;
    char* target;

    int ix;
    int iy;
    int ox;
    int oy;

    int last_ix;
    int last_iy;
    int last_ox;
    int last_oy;
};

struct t_block {
    JSAMPARRAY buffer;
    int w;
    int h;
    int color_components;
    int color_space;
};

struct t_block* load_block_from_file(char* fname) 
{
    FILE* f;
    struct jpeg_decompress_struct info;
    struct jpeg_error_mgr err;
    JSAMPARRAY buffer;
    int i;

    struct t_block* data = (struct t_block*)malloc(sizeof(struct t_block));

    f = fopen(fname, "rb");
    info.err = jpeg_std_error(&err);

    jpeg_create_decompress(&info);
    jpeg_stdio_src(&info, f);
    jpeg_read_header(&info, TRUE);
    jpeg_start_decompress(&info);

    data->w = info.output_width;
    data->h = info.output_height;
    data->color_components = info.output_components;
    data->color_space = info.out_color_space;

    buffer = (*info.mem->alloc_sarray)
        ((j_common_ptr) &info, JPOOL_IMAGE, 
        data->w * info.output_components, 1);

    data->buffer = (JSAMPARRAY)malloc(sizeof(JSAMPROW) * data->h);

    for (i=0; i<data->h; i++) {
        jpeg_read_scanlines(&info, buffer, 1);
        data->buffer[i] = (JSAMPROW)malloc(sizeof(JSAMPLE) * data->w * info.output_components);
        memcpy(data->buffer[i], buffer[0], data->w * info.output_components);
    }

    while (info.output_scanline < info.output_height) {
        jpeg_read_scanlines(&info, buffer, data->h);
    }

    jpeg_finish_decompress(&info);
    jpeg_destroy_decompress(&info);
    fclose(f);

    return data;
}

struct t_block* create_empty_block(int w, int h, int cc, int cs)
{
    int i;
    struct t_block* data = (struct t_block*)malloc(sizeof(struct t_block));
    data->w = w;
    data->h = h;
    data->color_components = cc;
    data->color_space = cs;
    data->buffer = (JSAMPARRAY)malloc(sizeof(JSAMPROW) * h);
    for (i=0; i<h; i++) {
        data->buffer[i] = (JSAMPROW)malloc(sizeof(JSAMPLE) * w * cc);
        memset(data->buffer[i], 0, sizeof(JSAMPLE) * w * cc);
    }
    return data;
}

int save_block(struct t_block* data, char* fname)
{
    int i;
    FILE* f;
    struct jpeg_compress_struct info;
    struct jpeg_error_mgr err;
    JSAMPROW row_pointer[1];

    f = fopen(fname, "wb");

    info.err = jpeg_std_error(&err);
    jpeg_create_compress(&info);
    jpeg_stdio_dest(&info, f);

    info.image_width = data->w;
    info.image_height = data->h;
    info.input_components = data->color_components;
    info.in_color_space = data->color_space;

    jpeg_set_defaults(&info);
    jpeg_set_quality(&info, QUALITY, TRUE);

    jpeg_start_compress(&info, TRUE);

    while (info.next_scanline < info.image_height) {
        row_pointer[0] = data->buffer[info.next_scanline];
        jpeg_write_scanlines(&info, row_pointer, 1);
    }

    jpeg_finish_compress(&info);
    fclose(f);
    jpeg_destroy_compress(&info);
}

int free_block(struct t_block* data)
{
    int i;
    for (i=0; i<data->h; i++) {
        free(data->buffer[i]);
    };
    free(data->buffer);
}

int update_block(struct t_block* data, JSAMPROW buffer, int x, int y, int len)
{
    int max = data->w - x;
    if (len < max) {
        max = len;
    }
    
    memcpy(data->buffer[y] + x * data->color_components, buffer, 
            max * data->color_components);
}

int flush_segments(struct t_crop* data, struct t_block** segments, int cols, int px, int py)
{
    char fname[100];
    int i;

    for (i=0; i<cols; i++) {
        sprintf(fname, "%s/0.%d.%d.jpg", data->target, px+i, py);
        save_block(segments[i], fname);
        free_block(segments[i]);

        printf("- %s\n", fname);
    }

    free(segments);
}

struct t_block** init_segments(struct t_crop* data, int cols, int px, int py)
{
    char fname[100];
    FILE* f;
    int i;

    struct t_block** segments = (struct t_block**)malloc(sizeof(struct t_block*) * cols);

    for (i=0; i<cols; i++) {
        sprintf(fname, "%s/0.%d.%d.jpg", data->target, px+i, py);

        f = fopen(fname, "rb");
        if (f != NULL) {
            fclose(f);
            segments[i] = load_block_from_file(fname);
        }
        else {
            segments[i] = create_empty_block(data->cw, data->ch, 3, JCS_RGB);
        }
    }

    return segments;
}

int crop(struct t_crop* data)
{
    FILE* f;
    struct jpeg_decompress_struct info;
    struct jpeg_error_mgr err;
    JSAMPARRAY buffer;
    int i, j;
    int w, h;
    int cc, cs;
    int px, py;
    int y;
    int len;
    int cols;
    struct t_block** segments = NULL;

    f = fopen(data->fname, "rb");
    info.err = jpeg_std_error(&err);

    jpeg_create_decompress(&info);
    jpeg_stdio_src(&info, f);
    jpeg_read_header(&info, TRUE);
    jpeg_start_decompress(&info);

    w = info.output_width;
    h = info.output_height;
    cc = info.output_components;
    cs = info.out_color_space;

    buffer = (*info.mem->alloc_sarray)
        ((j_common_ptr) &info, JPOOL_IMAGE, 
        w * cc, 1);

    cols = (int)ceil((w + data->ox) / (double)data->cw);

    segments = init_segments(data, cols, data->ix, data->iy);

    py = 0;
    y = data->oy;
    for (i=0; i<h; i++) {
        jpeg_read_scanlines(&info, buffer, 1);

        if (((data->oy + i) % data->ch == 0) && (i > 0)) {
            flush_segments(data, segments, cols, data->ix, data->iy+py);
            py++;
            segments = init_segments(data, cols, data->ix, data->iy+py);
            y = 0;
        }

        len = w;
        for (j=0; j<cols; j++) {
            if (data->ox > 0) {
                if (j == 0) {
                    update_block(segments[j], buffer[0], data->ox, y, data->cw - data->ox);
                    len -= data->cw - data->ox;
                }
                else {
                    update_block(segments[j], buffer[0] + (data->cw - data->ox + (j-1) * data->cw) * cc, 0, y, len > data->cw ? data->cw : len);
                    len -= data->cw;
                }
            }
            else {
                update_block(segments[j], buffer[0] + j * data->cw * cc, 0, y, len > data->cw ? data->cw : len);
                len -= data->cw;
            }
        }
        
        y++;
    }
    flush_segments(data, segments, cols, data->ix, data->iy+py);

    jpeg_finish_decompress(&info);
    jpeg_destroy_decompress(&info);
    fclose(f);

    data->last_ix = data->ix + cols - 1 - (data->ox > 0 ? 1 : 0);
    data->last_iy = data->iy + py;
    data->last_oy = (h - (data->ch - data->oy)) % data->ch;
    data->last_ox = (w - (data->cw - data->ox)) % data->cw;
}

int main(int argc, char** argv)
{
    int rows, cols;
    int i, j, k;
    char** files;
    int *ix, *iy, *ox, *oy;

    struct t_crop* data = (struct t_crop*)malloc(sizeof(struct t_crop));
    data->fname = (char*)malloc(sizeof(char) * 100);
    data->target = (char*)malloc(sizeof(char) * 100);

    data->cw = atoi(argv[1]);
    data->ch = atoi(argv[2]);
    strcpy(data->target, argv[3]);

    rows = atoi(argv[4]);
    cols = atoi(argv[5]);

    files = (char**)malloc(sizeof(char*) * rows * cols);
    ix = (int*)malloc(sizeof(int) * (cols + 1));
    ox = (int*)malloc(sizeof(int) * (cols + 1));
    iy = (int*)malloc(sizeof(int) * (rows + 1));
    oy = (int*)malloc(sizeof(int) * (rows + 1));

    k = 0;
    for (i=0; i<rows; i++) {
        for (j=0; j<cols; j++) {
            files[k] = argv[k+6];
            printf("File %d: %s\n", k, files[k]);
            k++;
        }
    }

    for (i=0; i<cols; i++) {
        ix[i] = 0;
        ox[i] = 0;
    }

    for (i=0; i<rows; i++) {
        iy[i] = 0;
        oy[i] = 0;
    }

    k = 0;
    for (i=0; i<rows; i++) {
        for (j=0; j<cols; j++) {
            strcpy(data->fname, files[k++]);
            data->ix = ix[j];
            data->iy = iy[i];
            data->ox = ox[j];
            data->oy = oy[i];

            printf("Processing %s..\n", data->fname); fflush(stdout);
            crop(data);
            printf("- done.\n");

            ox[j+1] = data->last_ox;
            oy[i+1] = data->last_oy;
            ix[j+1] = data->last_ix;
            iy[i+1] = data->last_iy;

            if (data->last_ox == data->cw) {
                ox[j+1]++;
                ix[j+1] = 0;
            }
            if (data->last_oy == data->ch) {
                oy[i+1]++;
                iy[i+1] = 0;
            }
        }
    }
}
