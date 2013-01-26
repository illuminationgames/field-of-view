if (!window.requestAnimationFrame) {
	(function() {
		var reqAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
		window.requestAnimationFrame = reqAnimFrame;
	})();
}

function HeartbeatCanvas() {
	//console.log('hb-init');
	this.canvasElem = $('<canvas id="hb-canvas" width="1600" height="1200">').appendTo('#cr-stage');
	this.canvasElem.css({
		position: 'absolute',
		zIndex: 2
	});
	this.moveTo(400,300);
	this.ctx = this.canvasElem[0].getContext('2d');
	this.beats = [];
	this.pulse = false;
	this.pulseDelay = 100;
	this._pulseInterval = false;
	this._pulseIntervalUpdate = false;
	this.lastFrame = false;
	this._aFrameProxy = $.proxy(this, '_animFrame');
	this.beatSpeed = this.rebeatSpeed = 200;
	this.beatMax = this.rebeatMax = 250;
}

$.extend(HeartbeatCanvas.prototype, {
	moveTo: function(x, y) {
		//console.log('hb-moveto',x,y);
		this.canvasElem.css({
			left: x - 800,
			top: y - 600
		});
	},
	setPulse: function(rate) {
	  if (this.pulse != rate) {
			this.pulse = rate;
			this._pulseIntervalUpdate = true;
			if (!rate) {
				if (this._pulseInterval) {
					window.clearInterval(this._pulseInterval);
					this._pulseInterval = false;
				}
			} else if (!this._pulseInterval) {
				this._pulseBeat();
			}
		}
	},
	_pulseBeat: function() {
		var self = this;
		if (this._pulseIntervalUpdate) {
			var newPulseTime = 60000.0 / this.pulse;
			if (this._pulseInterval) {
				window.clearInterval(this._pulseInterval);
			}
			this._pulseInterval = window.setInterval($.proxy(this,'_pulseBeat'), newPulseTime);
			this._pulseIntervalUpdate = false;
		}
		this.beat(this.beatMax, this.beatSpeed);
		window.setTimeout(function() {self.beat(self.rebeatMax, self.rebeatSpeed);}, this.pulseDelay);
	},
	beat: function(maxRadius, speed) {
		this.beats.push({
			radius: 0,
			maxRadius: maxRadius,
			speed: speed
		});
		if (this.beats.length > 4) {
			this.beats.splice(0,1);
		}
		if (this.lastFrame === false) {
			this.lastFrame = Date.now();
			this._animFrame(this.lastFrame);
		}
	},
	_animFrame: function(timestamp) {
		var delta = (timestamp - this.lastFrame) / 1000.0;
		this.lastFrame = timestamp;
		for (var b = 0; b < this.beats.length; b++) {
			this.beats[b].radius += delta * this.beats[b].speed;
			this.beats[b].speed -= delta * 70;
			if (this.beats[b].radius > this.beats[b].maxRadius) {
				this.beats.splice(b, 1);
				b--;
			}
		}

		this._draw();

		if (this.beats.length) {
			window.requestAnimationFrame(this._aFrameProxy, this.canvasElem[0]);
		} else {
			this.lastFrame = false;
		}
	},
	_draw: function() {
		//console.log('hb-draw');
		var ctx = this.ctx;
		ctx.clearRect(0, 0, 1600, 1200);
		ctx.save();
		ctx.strokeStyle = '#FFFFFF';
		for (var b = 0; b < this.beats.length; b++) {
			ctx.beginPath();
			ctx.arc(800, 600, this.beats[b].radius, 0, Math.PI * 2);
			ctx.closePath();
			ctx.stroke();
		}
		ctx.restore();
	}
});
