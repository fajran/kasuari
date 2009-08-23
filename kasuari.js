(function() {

function getMaxZoomLevel(config) {
	var w = config.w;
	var h = config.h;
	var max = 0;
	while (true) {
		if ((w <= config.tw) && (h <= config.th)) {
			break;
		}
		w = Math.ceil(w/2);
		h = Math.ceil(h/2);
		max++;
	}
	return max;
}

function setupEventHandler(kasuari) {
	kasuari.canvas.mousedown(function(e) {
		kasuari.mousedown(e);
	});
	kasuari.canvas.mousemove(function(e) {
		kasuari.mousemove(e);
	});
	kasuari.canvas.mouseup(function(e) {
		kasuari.mouseup(e);
	});
	kasuari.canvas.dblclick(function(e) {
		kasuari.zoom(e.clientX, e.clientY, 1.5);
	});
	kasuari.canvas.mousewheel(function(e, d) {
		if (d > 0) {
			kasuari.zoom(e.clientX, e.clientY, 1.5);
		}
		else {
			kasuari.zoom(e.clientX, e.clientY, 2/3.0);
		}
		return false;
	});
}

var KasuariImage = function(url, kasuari) {
	this.kasuari = kasuari;
	var self = this;
	this.loaded = false;
	this.url = url;
	this.img = new Image();
	this.img.onload = function() {
		self.loaded = true;	
		updateImageGeometry(self.kasuari);
		drawCanvas(self.kasuari);
	}
}

KasuariImage.prototype = {
	init: function() {
		this.img.src = this.url;
	},

	draw: function() {
		if (!this.loaded) { return; }
		var ctx = this.kasuari.ctx;
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.drawImage(this.img, 0, 0, this.w, this.h);
		ctx.restore();
	},
};

function addImage(kasuari, zoomLevel, ix, iy) {
	var url = kasuari.config.imgdir + '/img-z' + zoomLevel + '.x' + ix + '.y' + iy + kasuari.config.ext;
	var img = new KasuariImage(url, kasuari);

	var scale = kasuari.scale;
	var w = Math.ceil(kasuari.tw * scale);
	var h = Math.ceil(kasuari.th * scale);

	img.id = zoomLevel+'-'+ix+'-'+iy;
	img.ix = ix;
	img.iy = iy;

	kasuari.images.push(img);

	img.init();
}

function updateImages(kasuari) {
	var x0 = -kasuari.px;
	var y0 = -kasuari.py;
	var x1 = x0 + kasuari.cw;
	var y1 = y0 + kasuari.ch;

	var ix0 = Math.floor(x0/(kasuari.tw*kasuari.scale))-1;
	var iy0 = Math.floor(y0/(kasuari.th*kasuari.scale))-1;
	var ix1 = Math.ceil(kasuari.cw/(kasuari.tw*kasuari.scale))+2 + ix0;
	var iy1 = Math.ceil(kasuari.ch/(kasuari.th*kasuari.scale))+2 + iy0;

	var add = {};
	var del = [];

	var x, y;
	for (y=iy0; y<iy1; y++) {
		for (x=ix0; x<ix1; x++) {
			if ((x < 0) || (y < 0)) { continue; }
			var ix = Math.floor(x * kasuari.step * kasuari.tw);
			var iy = Math.floor(y * kasuari.step * kasuari.th);
			if ((ix > kasuari.iw) || (iy > kasuari.ih)) { continue; }

			add[kasuari.zoomLevel+'-'+x+'-'+y] = [ x, y ];
		}
	}

	var images = [];

	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var o = kasuari.images[i];
		if (add[o.id] != undefined) {
			images.push(o);
			delete add[o.id];
		}
		
	};

	kasuari.images = images;

	for (var k in add) {
		var d = add[k];
		addImage(kasuari, kasuari.zoomLevel, d[0], d[1]);
	}
}

function updateImageGeometry(kasuari) {
	var w = Math.ceil(kasuari.tw * kasuari.scale);
	var h = Math.ceil(kasuari.th * kasuari.scale);
	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var img = kasuari.images[i];
		img.x = img.ix * w;
		img.y = img.iy * h;
		img.w = Math.ceil(img.img.width * kasuari.scale);
		img.h = Math.ceil(img.img.height * kasuari.scale);
	}
}

function drawCanvas(kasuari) {
	var ctx = kasuari.ctx;
	ctx.clearRect(0, 0, kasuari.cw, kasuari.ch);
	ctx.save();
	ctx.translate(kasuari.px, kasuari.py);

	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var img = kasuari.images[i];
		img.draw();
	}

	ctx.restore();
}

function smoothMove(kasuari) {
	var dx = kasuari.drag.x + kasuari.drag.dx - kasuari.px;
	var dy = kasuari.drag.y + kasuari.drag.dy - kasuari.py;
	dx = Math.ceil(dx * 0.2);
	dy = Math.ceil(dy * 0.2);
	kasuari.px += dx;
	kasuari.py += dy;

	updateImages(kasuari);
	drawCanvas(kasuari);

	if ((dx != 0) || (dy != 0)) {
		kasuari.timer = setTimeout(function() { 
			smoothMove(kasuari) 
		}, 20);
	}
	else {
		clearTimeout(kasuari.timer);
		kasuari.timer = undefined;
	}
}

var Kasuari = function(canvas, config) {
	// default configuration
	this.config = {
		tw: 256,
		th: 256,
		x: 0,
		y: 0,
		zoomLevel: -1,
		zoomStep: 2,
		ext: '.jpg'
	}

	// override configuration
	for (var k in config) {
		this.config[k] = config[k];
	}

	this.canvas = canvas;
	this.ctx = this.canvas.get(0).getContext('2d');

	this.maxZoomLevel = getMaxZoomLevel(this.config);

	if (this.config.zoomLevel == -1) { this.zoomLevel = this.maxZoomLevel; }
	else { this.zoomLevel = this.config.zoomLevel; }

	this.tw = this.config.tw;
	this.th = this.config.th;
	this.iw = this.config.w;
	this.ih = this.config.h;
	this.zoomStep = this.config.zoomStep;

	this.cw = this.canvas.width();
	this.ch = this.canvas.height();
	canvas.get(0).width = this.cw;
	canvas.get(0).height = this.ch;

	this.step = Math.pow(this.zoomStep, this.zoomLevel);
	this.scale = 1;
	this.zoomInLimit = 1.25;
	this.zoomOutLimit = 1.0/this.zoomStep;
	this.timer = undefined;

	this.px = Math.ceil(this.config.x / this.step);
	this.py = Math.ceil(this.config.y / this.step);

	this.drag = {
		enabled: false,
		x: 0,
		y: 0
	};

	this.images = [];

	this.timer = undefined;
};

Kasuari.prototype = {
	start: function() {
		setupEventHandler(this);
		this.updateCanvas();
	},

	updateCanvas: function() {
		updateImages(this);
		updateImageGeometry(this);
		drawCanvas(this);
	},

	mousedown: function(e) {
		this.drag.x = e.clientX;
		this.drag.y = e.clientY;
		this.drag.dx = this.px - this.drag.x;
		this.drag.dy = this.py - this.drag.y;
		this.drag.enabled = true;
	},

	mousemove: function(e) {
		if (this.drag.enabled) {
			this.drag.x0 = this.drag.x;
			this.drag.y0 = this.drag.y;
			this.drag.x = e.clientX;
			this.drag.y = e.clientY;

			if (!this.timer) {
				var self = this;
				this.timer = setTimeout(function() {
					smoothMove(self);
				}, 20);
			}

		}
	},

	mouseup: function(e) {
		var dx = this.drag.x - this.drag.x0;
		var dy = this.drag.y - this.drag.y0;
		if (Math.abs(dx) >= 5) { if (dx > 30) { dx = 30; }; this.drag.x += dx * 10; }
		if (Math.abs(dy) >= 5) { if (dy > 30) { dy = 30; }; this.drag.y += dy * 10; }
		this.drag.enabled = false;
	},

	zoom: function(x, y, zoom) {
		clearTimeout(this.timer);
		this.timer = undefined;

		var zoomLevel = this.zoomLevel;
		var scale = this.scale * zoom;
		if ((zoomLevel > 0) && (scale > this.zoomInLimit)) {
			while (scale > this.zoomInLimit) {
				zoomLevel--;
				scale = scale / this.zoomStep;
			}
			if (zoomLevel < 0) {
				zoomLevel = 0;
			}
		}
		else if ((zoomLevel < this.maxZoomLevel) && (scale < this.zoomOutLimit)) {
			while (scale < this.zoomOutLimit) {
				zoomLevel++;
				scale = scale * this.zoomStep;
			}
			if (zoomLevel > this.maxZoomLevel) {
				zoomLevel = this.maxZoomLevel;
			}
		}

		this.scale = scale;

		if (zoomLevel != this.zoomLevel) {
			this.zoomLevel = zoomLevel;
			this.step = Math.pow(this.zoomStep, this.zoomLevel);
		}

		this.px = Math.floor(x - (x - this.px) * zoom);
		this.py = Math.floor(y - (y - this.py) * zoom);
		this.updateCanvas();
	}
};

this.Kasuari = Kasuari;

})();
