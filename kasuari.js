(function() {

function getMaxLevel(config) {
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
	kasuari.obj.get(0).addEventListener('mousedown', function(e) {
		kasuari.mousedown(e);
	}, true);
	kasuari.obj.mousemove(function(e) {
		kasuari.mousemove(e);
	});
	kasuari.obj.mouseup(function(e) {
		kasuari.mouseup(e);
	});
	kasuari.obj.dblclick(function(e) {
		kasuari.zoom(e.clientX, e.clientY, 1.5);
	});
	kasuari.obj.mousewheel(function(e, d) {
		if (d > 0) {
			kasuari.zoom(e.clientX, e.clientY, 1.5);
		}
		else {
			kasuari.zoom(e.clientX, e.clientY, 2/3.0);
		}
		return false;
	});
}

function moveImages(kasuari, dx, dy) {
	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var o = kasuari.images[i];
		var x = o.data('x') + dx;
		var y = o.data('y') + dy;
		o.data('x', x);
		o.data('y', y);
	};
}

function addImage(kasuari, zoomLevel, ix, iy) {
	var url = kasuari.config.imgdir + '/img-z' + zoomLevel + '.x' + ix + '.y' + iy + kasuari.config.ext;
	var img = $('<img class="img" src="'+url+'"/>');
	img.data('ix', ix);
	img.data('iy', iy);

	var scale = kasuari.scale;
	var w = Math.ceil(kasuari.tw * scale);
	var h = Math.ceil(kasuari.th * scale);
	console.log('addImage: scale=', scale, 'w=', w, 'h=', h);

	img.data('id', zoomLevel+'-'+ix+'-'+iy);

	img.data('x', kasuari.px + ix * w);
	img.data('y', kasuari.py + iy * h);
	img.data('w', w);
	img.data('h', h);

	img.css({
		'left': img.data('x') + 'px',
		'top': img.data('y') + 'px',
		'width': img.data('w') + 'px',
		'height': img.data('h') + 'px',
	});

	img.mousedown(function(e) { return false; });

	kasuari.obj.append(img);
	kasuari.images.push(img);
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
			var ix = x * kasuari.step * kasuari.tw;
			var iy = y * kasuari.step * kasuari.th;
			if ((ix > kasuari.iw) || (iy > kasuari.ih)) { continue; }

			var px = x * kasuari.tw;
			var py = y * kasuari.th;

			add[kasuari.zoomLevel+'-'+x+'-'+y] = [ x, y ];
		}
	}

	var images = [];

	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var o = kasuari.images[i];
		var id = o.data('id');
		if (add[id] == undefined) {
			console.log('Remove: id=', o.data('id'));
			o.remove();
		}
		else {
			images.push(o);
			delete add[id];
		}
	};

	kasuari.images = images;

	for (var k in add) {
		var d = add[k];
		addImage(kasuari, kasuari.zoomLevel, d[0], d[1]);
	}
	
}

function updateImagePosition(kasuari) {
	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var img = kasuari.images[i];
		img.css({
			'left': img.data('x') + 'px',
			'top': img.data('y') + 'px',
		});
	}
}

function updateImageSize(kasuari) {
	var i, size = kasuari.images.length;
	for (i=0; i<size; i++) {
		var img = kasuari.images[i];
		img.css({
			'width': img.data('w') + 'px',
			'height': img.data('h') + 'px',
		});
	}
}

var Kasuari = function(s, config) {
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

	// initialize variables
	this.obj = $(s);
	this.maxZoomLevel = getMaxLevel(this.config);

	if (this.config.zoomLevel == -1) { this.zoomLevel = this.maxZoomLevel; }
	else { this.zoomLevel = this.config.zoomLevel; }

	this.tw = this.config.tw;
	this.th = this.config.th;
	this.iw = this.config.w;
	this.ih = this.config.h;
	this.zoomStep = this.config.zoomStep;

	this.cw = this.obj.width();
	this.ch = this.obj.height();
	this.step = Math.pow(this.zoomStep, this.zoomLevel);
	this.scale = 1;
	this.zoomInLimit = 1.25;
	this.zoomOutLimit = 1.0/this.zoomStep;
	
	// projected image size
	this.piw = Math.ceil(this.config.w / this.step);
	this.pih = Math.ceil(this.config.h / this.step);
	this.px = Math.ceil(this.config.x / this.step);
	this.py = Math.ceil(this.config.y / this.step);

	this.drag = {
		enabled: false,
		x: 0,
		y: 0
	};

	this.images = [];
}

Kasuari.prototype = {

	start: function() {
		setupEventHandler(this);
		this.updateCanvas();
	},

	updateCanvas: function() {
		updateImages(this);
		updateImagePosition(this);
		updateImageSize(this);
	},

	// Event handler
	mousedown: function(e) {
		this.drag.enabled = true;
		this.drag.x = e.clientX;
		this.drag.y = e.clientY;
	},

	mousemove: function(e) {
		if (this.drag.enabled) {
			var x = e.clientX;
			var y = e.clientY;
			var dx = x - this.drag.x;
			var dy = y - this.drag.y;
			this.drag.x = x;
			this.drag.y = y;

			moveImages(this, dx, dy);

			this.px += dx;
			this.py += dy;

			updateImages(this);
			updateImagePosition(this);
		}
	},

	mouseup: function(e) {
		this.drag.enabled = false;
	},

	zoom: function(x, y, zoom) {
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
			this.piw = Math.ceil(this.config.w / this.step);
			this.pih = Math.ceil(this.config.h / this.step);
		}

		//var px = this.px;
		//var py = this.py;
		this.px = x - (x - this.px) * zoom;
		this.py = y - (y - this.py) * zoom;

		//console.log(px, py, this.px, this.py, x, y, zoom, this.scale);

		console.log('zoom:', zoom, x, y, this.scale, this.zoomLevel);

		var w = Math.ceil(this.tw * this.scale);
		var h = Math.ceil(this.th * this.scale);

		// update image size
		var i, size = this.images.length;
		for (i=0; i<size; i++) {
			var img = this.images[i];

			img.data('x', this.px + img.data('ix') * w);
			img.data('y', this.py + img.data('iy') * h);
			img.data('w', w);
			img.data('h', h);

		}

		console.log('zoom: scale=', this.scale);

		this.updateCanvas();
	},

}

this.Kasuari = Kasuari;

})();
