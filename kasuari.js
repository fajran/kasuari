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
		kasuari.zoomIn(e);
	});
	kasuari.obj.scroll(function(e) {
		console.log(e);
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
		o.css({
			'top': y+'px',
			'left': x+'px'
		});
	};
}

function addImage(kasuari, zoom, ix, iy, x, y) {
	var url = kasuari.config.imgdir + '/img-z' + zoom + '.x' + ix + '.y' + iy + '.jpg';
	var img = $('<img class="img" style="top:'+y+'px; left:'+x+'px" src="'+url+'"/>');
	img.data('x', x);
	img.data('y', y);
	img.data('id', zoom+'-'+ix+'-'+iy);
	img.mousedown(function(e) { return false; });
	kasuari.obj.append(img);
	kasuari.images.push(img);
}

var Kasuari = function(s, config) {
	// default configuration
	this.config = {
		tw: 256,
		th: 256,
		x: 0,
		y: 0,
		zoom: -1
	}

	// override configuration
	for (var k in config) {
		this.config[k] = config[k];
	}

	// initialize variables
	this.obj = $(s);
	this.maxZoomLevel = getMaxLevel(this.config);

	if (this.config.zoom == -1) { this.zoom = this.maxZoomLevel; }
	else { this.zoom = this.config.zoom; }

	this.tw = this.config.tw;
	this.th = this.config.th;
	this.iw = this.config.w;
	this.ih = this.config.h;

	this.cw = this.obj.width();
	this.ch = this.obj.height();
	this.step = Math.pow(2, this.zoom);
	
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
		// addImage(this, 3, 0, 0, 0, 0);

		// addImage(this, 2, 0, 0, 0, 0);
		// addImage(this, 2, 1, 0, 256, 0);
		// addImage(this, 2, 0, 1, 0, 256);
		// addImage(this, 2, 1, 1, 256, 256);

		var x0 = -this.px;
		var y0 = -this.py;
		var x1 = x0 + this.cw;
		var y1 = y0 + this.ch;

		var ix0 = Math.floor(x0/this.tw)-1;
		var iy0 = Math.floor(y0/this.th)-1;
		var ix1 = Math.ceil(this.cw/this.tw)+2 + ix0;
		var iy1 = Math.ceil(this.ch/this.th)+2 + iy0;

		var add = {};
		var del = [];

		var x, y;
		for (y=iy0; y<iy1; y++) {
			for (x=ix0; x<ix1; x++) {
				if ((x < 0) || (y < 0)) { continue; }
				var ix = x * this.step * this.tw;
				var iy = y * this.step * this.th;
				if ((ix > this.iw) || (iy > this.ih)) { continue; }

				var px = x * this.tw;
				var py = y * this.th;

				add[this.zoom+'-'+x+'-'+y] = [ x, y, px, py ];
			}
		}

		var images = [];

		var i, size = this.images.length;
		for (i=0; i<size; i++) {
			var o = this.images[i];
			var id = o.data('id');
			if (add[id] == undefined) {
				o.remove();
			}
			else {
				images.push(o);
				delete add[id];
			}
		};

		this.images = images;

		for (var k in add) {
			var d = add[k];
			addImage(this, this.zoom, d[0], d[1], d[2] + this.px, d[3] + this.py);
		}
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
			this.updateCanvas();
		}
	},

	mouseup: function(e) {
		this.drag.enabled = false;
	},

	zoomIn: function(e) {
		if (this.zoom <= 0) return;

		var x = e.clientX;
		var y = e.clientY;

		this.zoom--;
		this.step = Math.pow(2, this.zoom);
		
		// projected image size
		this.piw = Math.ceil(this.config.w / this.step);
		this.pih = Math.ceil(this.config.h / this.step);
		this.px -= x - this.px;
		this.py -= y - this.py;
		
		this.updateCanvas();
	}
}

this.Kasuari = Kasuari;

})();
