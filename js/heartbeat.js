if (!window.requestAnimationFrame) {
	(function() {
		var reqAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
		window.requestAnimationFrame = reqAnimFrame;
	})();
}

function HeartbeatCanvas() {
	//console.log('hb-init');
	this.backdrop = $('<div>').css({
		position:'absolute',
		zIndex:2,
		width:1600,
		height:1200
	}).appendTo('#cr-stage');
	this.canvasElem = $('<canvas id="hb-canvas" width="1600" height="1200">').appendTo(this.backdrop);
	this.lastDeltas = [];
	this.moveTo(400,300);
	this.ctx = this.canvasElem[0].getContext('2d');
	this.beats = [];
	this.pulse = false;
	this.pulseDelay = 100;
	this._pulseInterval = false;
	this._pulseIntervalUpdate = false;
	this.lastFrame = false;
	this._aFrameProxy = $.proxy(this, '_animFrame');
	this.beatSpeed = 200;
	this.targetVisibility = false;
	this.visSpeed = false;
	this.visibility = false;
	//this._setVisibility(this.beatMax);
	this.lastClone = -1;
	this._homeDirection = 0;
	lowLag.init({'urlPrefix':'audio/','debug':'none'});
	lowLag.load(["Heartbeat1.wav"], 'Heartbeat1');
	lowLag.load(["Heartbeat2.wav"], 'Heartbeat2');
	lowLag.load(["Heartbeat3.wav"], 'Heartbeat3');
}

$.extend(HeartbeatCanvas.prototype, {
	moveTo: function(x, y) {
		//console.log('hb-moveto',x,y);
		this.backdrop.css({
			left: x - 800,
			top: y - 600
		});
	},
	disable: function() {
		this.setPulse(false);
		this.beats = [];
		this._setVisibility(false);
	},
	setVisibility: function(targetVis) {
		if (this.pulse) {
			this.targetVis = targetVis;
			this.visSpeed = (targetVis - this.visibility) * 3;
		} else {
			this._setVisibility(targetVis);
		}
	},
	setHomeDirection: function(x, y) {
		this._homeDirection = Math.atan2(y, x);
	},
	_setVisibility: function(maxVis) {
		this.visibility = maxVis;
		if (maxVis === false) {
			this.backdrop.css('background','');
		} else if (maxVis > 20) {
			var maxRad = maxVis + 20;
			var gradDef = 'circle '+maxRad+'px, rgba(0,0,0,0) 0px';
			if (maxVis > 70)
				gradDef += ', rgba(0,0,0,0.2) 50px';
			gradDef += ', rgba(0,0,0,0.5) '+(maxVis-20)+'px';
			gradDef += ', rgba(0,0,0,0.8) '+maxRad+'px';
			this.backdrop.css({
				backgroundImage: 'radial-gradient('+gradDef+')'
			});
			this.setPulse(this._pulseFromVisibility(maxVis));
		} else {
			this.backdrop.css({
				background: 'black'
			});
			this.visibility = 0;
			this.setPulse(false);
		}
	},
	_pulseFromVisibility: function(maxVis) {
		var highPulse=160, lowPulse=60;
		var lowVis=50, highVis=250;
		if (maxVis < lowVis) return highPulse;
		if (maxVis > highVis) return lowPulse;
		var visRatio = (maxVis - lowVis) / (highVis - lowVis);
		return (highPulse + visRatio * (lowPulse - highPulse));
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
	_pulseToSoundFile: function(pulse) {
		if (pulse < 70) {
			return 'Heartbeat3';
		} else if (pulse < 100) {
			return 'Heartbeat2';
		} else {
			return 'Heartbeat1';
		}
	},
	_soundFileToDelay: function(soundFile) {
		if (soundFile == 'Heartbeat1') {
			return 100;
		} else if (soundFile == 'Heartbeat2') {
			return 200;
		} else {
			return 300;
		}
	},
	_pulseBeat: function() {
		var self = this;
		if (this._pulseInterval) {
			window.clearTimeout(this._pulseInterval);
		}
		this.beat(this.visibility, this.beatSpeed);
		var soundFile = this._pulseToSoundFile(this.pulse);
		this.lastClone = (this.lastClone + 1) % 5;
		lowLag.play(soundFile, this.lastClone);
		window.setTimeout(function() {self.beat(self.visibility, self.beatSpeed);}, this._soundFileToDelay(soundFile));
		this._pulseInterval = window.setTimeout($.proxy(this,'_pulseBeat'), 60000.0 / this.pulse);
	},
	beat: function(maxRadius, speed) {
		this.beats.push({
			radius: 0,
			maxRadius: maxRadius,
			speed: speed,
			opacity: 1,
		});
		if (this.lastFrame === false) {
			this.lastFrame = Date.now();
			this._animFrame(this.lastFrame);
		}
	},
	_animFrame: function(timestamp) {
		var delta = (timestamp - this.lastFrame) / 1000.0;
		this.lastFrame = timestamp;
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			var ratio = beat.radius / this.visibility;
			var multiplier = 1 - 0.5 * ratio
			beat.radius += delta * beat.speed * multiplier;
			beat.opacity = 1 - (0.9 * ratio * ratio);
			if (beat.radius > this.visibility) {
				this.beats.splice(b, 1);
				b--;
			}
		}

		if (this.visSpeed) {
			var newVis = this.visibility + this.visSpeed * delta;
			if ((this.visSpeed > 0 && newVis > this.targetVis) ||
					(this.visSpeed < 0 && newVis < this.targetVis)) {
				newVis = this.targetVis;
				this.visSpeed = false;
			}
			this._setVisibility(newVis);
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
		ctx.clearRect(0,0,1600,1200);
		if (!this.beats.length) return;
		ctx.save();
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(255,255,255,'+beat.opacity+')';
			ctx.beginPath();
			ctx.arc(800, 600, beat.radius, 0, Math.PI * 2);
			ctx.closePath();
			ctx.stroke();

			ctx.lineWidth = 3;
			ctx.strokeStyle = 'rgba(255,255,255,0.7)';
			var arcWidth = Math.PI / 4 * beat.opacity;
			ctx.beginPath();
			ctx.arc(800, 600, beat.radius, this._homeDirection - arcWidth, this._homeDirection + arcWidth);
			ctx.stroke();
		}
		ctx.restore();
	}
});
