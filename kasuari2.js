(function() {

var KasuariImage = function(ix, iy, iz, url) {
    this.ix = ix;
    this.iy = iy;
    this.iz = iz;
    this.scale = Math.pow(2, iz);
    this.loaded = false;
    this.url = url;
    this.img = new Image();
    this.onload = undefined;

    this.id = ix + '-' + iy + '-' + iz;

    var self = this;
    this.img.onload = function() {
        self.loaded = true;
        if (self.onload != undefined) {
            self.onload(self);
        }
    };
};

KasuariImage.prototype = {
    init: function() {
        this.img.src = this.url;
    },

    draw: function(ctx, scale) {
        if (!this.loaded) { return; }
        var s = scale * this.scale;
        var dim = 256 * s;
        var x = Math.ceil(this.ix * dim);
        var y = Math.ceil(this.iy * dim);
        var w = Math.ceil(this.img.width * s);
        var h = Math.ceil(this.img.height * s);
        ctx.drawImage(this.img, x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }
};

var Kasuari = function(canvas, config) {
    this.canvas = canvas.get(0);
    this.cw = canvas.width();
    this.ch = canvas.height();
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext('2d');

    this.dir = config.imgdir;
    this.ext = config.ext;
    this.zoom = config.zoom;
    this.w = config.w;
    this.h = config.h;

    this.scale = Math.pow(0.5, this.zoom);
    this.tx = 0;
    this.ty = 0;

    this.images = [];
};

Kasuari.prototype = {
    getURL: function(ix, iy, iz) {
        return this.dir + '/img-z' + iz + '.x' + ix + '.y' + iy + this.ext;
    },

    start: function() {
        this.updateImages();
    },

    addImage: function(ix, iy, iz) {
        var url = this.getURL(ix, iy, iz);
        var img = new KasuariImage(ix, iy, iz, url);
        var self = this;
        img.onload = function(img) {
            self.images.push(img);
            self.redraw();
        }
        return img;
    },

    redraw: function() {
        var len = this.images.length;

	    this.ctx.clearRect(0, 0, this.cw, this.ch);

        this.ctx.save();
        this.ctx.translate(this.tx, this.ty);
        for (var i=0; i<len; i++) {
            var img = this.images[i];
            img.draw(this.ctx, this.scale);
        }
        this.ctx.restore();
    },

    updateImages: function() {
        var x0 = -this.tx;
        var y0 = -this.ty;
        var x1 = x0 + this.cw;
        var y1 = y0 + this.ch;

        console.log(x0, y0, x1, y1);
        console.log('scale:', this.scale);

	    var ix0 = Math.floor(x0/(256*this.scale))-1;
	    var iy0 = Math.floor(y0/(256*this.scale))-1;
	    var ix1 = Math.ceil(this.cw/(256*this.scale))+2 + ix0;
	    var iy1 = Math.ceil(this.ch/(256*this.scale))+2 + iy0;

        console.log(ix0, iy0, ix1, iy1);

        var add = {};
        var del = [];

        console.log(this.scale, this.zoom);
        console.log((Math.log(this.scale) / Math.log(0.5)))
        var w = 256 * this.scale; //Math.pow(2, Math.log(this.scale) / Math.log(0.5)) * 256;
        var h = Math.pow(2, Math.log(this.scale) / Math.log(0.5)) * 256;
        h = w;

        console.log('w:', w, 'h:', h);

        var x, y;
	    for (y=iy0; y<iy1; y++) {
	    	for (x=ix0; x<ix1; x++) {
	    		if ((x < 0) || (y < 0)) { continue; }
	    		var ix = Math.floor(x * w);
	    		var iy = Math.floor(y * h);
                // console.log('x:', x, 'y:', y, '=>', ix, iy);
	    		if ((ix > this.w) || (iy > this.h)) { continue; }
                // console.log("===>", x, y, ">>", ix, iy);
	    		add[x+'-'+y+'-'+this.zoom] = [ x, y ];
	    	}
	    }

        console.log(add);

	    var images = [];

	    var i, size = this.images.length;
	    for (i=0; i<size; i++) {
	    	var o = this.images[i];
	    	if (add[o.id] != undefined) {
	    		images.push(o);
	    		delete add[o.id];
	    	}
	    };

        this.images = images;

        for (var k in add) {
            var d = add[k];
            this.addImage(d[0], d[1], this.zoom).init();
        }
    }
};

this.Kasuari = Kasuari;

})();
