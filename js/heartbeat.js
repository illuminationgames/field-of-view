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
	this.beatMax = 250;
	this.targetVisibility = false;
	this.visSpeed = false;
	this._setVisibility(this.beatMax);
	this.lastClone = -1;
	this._homeDirection = 0;
	lowLag.init({'urlPrefix':'audio/','debug':'none'});
	lowLag.load(["Heartbeat1.wav"], 'Heartbeat1');
	lowLag.load(["Heartbeat2.wav"], 'Heartbeat2');
	lowLag.load(["Heartbeat3.wav"], 'Heartbeat3');
	/*
		Crafty.audio.add({
			Heartbeat1: "audio/Heartbeat1.wav",
			Heartbeat2: "audio/Heartbeat2.wav",
			Heartbeat3: "audio/Heartbeat3.wav"
		});
		*/
}

$.extend(HeartbeatCanvas.prototype, {
	moveTo: function(x, y) {
		//console.log('hb-moveto',x,y);
		this.backdrop.css({
			left: x - 800,
			top: y - 600
		});
	},
	setVisibility: function(targetVis) {
		this.targetVis = targetVis;
		this.visSpeed = (targetVis - this.visibility) * 3;
	},
	setHomeDirection: function(x, y) {
		this._homeDirection = Math.atan2(y, x);
	},
	_setVisibility: function(maxVis) {
		this.visibility = this.beatMax = maxVis;
		var maxRad = maxVis + 20;
		var gradDef = 'circle '+maxRad+'px, rgba(0,0,0,0) 0px';
		if (maxVis > 70)
			gradDef += ', rgba(0,0,0,0.2) 50px';
		//console.log(maxRad,maxVis,beatRad);
		/*
		if (beatRad >= maxVis - 40)
			beatRad = maxVis - 40;
		gradDef += ', rgba(0,0,0,0.3) '+(beatRad)+'px';
		*/
		gradDef += ', rgba(0,0,0,0.5) '+(maxVis-20)+'px';
		gradDef += ', rgba(0,0,0,0.8) '+maxRad+'px';
		//console.log('visdef',gradDef);
		this.backdrop.css({
			backgroundImage: 'radial-gradient('+gradDef+')'
		});
		this.setPulse(this._pulseFromVisibility(maxVis));
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
		/*
		if (this._pulseIntervalUpdate) {
			var newPulseTime = 60000.0 / this.pulse;
			if (this._pulseInterval) {
				window.clearInterval(this._pulseInterval);
			}
			this._pulseInterval = window.setInterval($.proxy(this,'_pulseBeat'), 50);
			this._pulseIntervalUpdate = false;
		}
		var newTime = Date.now();
		if (!forcePulse && newTime < this._nextPulse) {
			return;
		}
		this._nextPulse = newTime + (60000.0 / this.pulse);
		*/
		if (this._pulseInterval) {
			window.clearTimeout(this._pulseInterval);
		}
		this.beat(this.beatMax, this.beatSpeed);
		var soundFile = this._pulseToSoundFile(this.pulse);
		this.lastClone = (this.lastClone + 1) % 5;
		lowLag.play(soundFile, this.lastClone);
		window.setTimeout(function() {self.beat(self.beatMax, self.beatSpeed);}, this._soundFileToDelay(soundFile));
		this._pulseInterval = window.setTimeout($.proxy(this,'_pulseBeat'), 60000.0 / this.pulse);
	},
	beat: function(maxRadius, speed) {
		this.beats.push({
			radius: 0,
			maxRadius: maxRadius,
			speed: speed,
			opacity: 1,
		});
		/*
		if (this.beats.length > 4) {
			this.beats.splice(0,1);
		}
		*/
		if (this.lastFrame === false) {
			this.lastFrame = Date.now();
			this._animFrame(this.lastFrame);
		}
	},
	_animFrame: function(timestamp) {
		var delta = (timestamp - this.lastFrame) / 1000.0;
		/*
		this.lastDeltas.push(delta);
		if (this.lastDeltas.length > 50) {
			console.log(this.lastDeltas);
			this.lastDeltas = [];
		}
		*/
		this.lastFrame = timestamp;
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			var ratio = beat.radius / this.visibility /*beat.maxRadius*/;
			var multiplier = 1 - 0.5 * ratio
			beat.radius += delta * beat.speed * multiplier;
			//beat.speed -= delta * 70;
			beat.opacity = 1 - (0.9 * ratio * ratio);
			if (/*beat.radius > beat.maxRadius || */beat.radius > this.visibility) {
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

/*
		if (this.beats.length) {
			this.setVisibility(this.beats[0].radius, this.beats[0].maxRadius);
		}
		*/
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
		/*
		ctx.save();
		var maxRadius = this.beats[0].radius + 10;
		var grad = ctx.createRadialGradient(800, 600, 0, 800, 600, maxRadius);
		var lastStop = -1;
		function addStop(pxRad, opacity) {
			if (pxRad <= lastStop) {
				return;
				pxRad = lastStop + 1;
			}
			lastStop = pxRad;
			grad.addColorStop(pxRad / maxRadius, 'rgba(0,0,0,'+opacity+')');
		}
		addStop(0, 0);
		if (maxRadius >= 50) {
			addStop(50, 0.2);
		}
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			addStop(beat.radius-5, 1-(beat.opacity*0.8));
			addStop(beat.radius, 1-beat.opacity);
			addStop(beat.radius+5, 1-(beat.opacity*0.8));
		}
		addStop(maxRadius, 0.8);
		ctx.fillStyle = grad;
		ctx.fillRect(0,0,1600,1200);
		ctx.restore();
		*/
		ctx.save();
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(255,255,255,'+beat.opacity+')';
			ctx.beginPath();
			ctx.arc(800, 600, beat.radius, 0, Math.PI * 2);
			ctx.closePath();
			ctx.stroke();

			ctx.lineWidth = 2;
			ctx.strokeStyle = 'rgba(255,255,255,0.9)';
			var arcWidth = Math.PI / 3 * beat.opacity;
			ctx.beginPath();
			ctx.arc(800, 600, beat.radius, this._homeDirection - arcWidth, this._homeDirection + arcWidth);
			ctx.stroke();
		}
		ctx.restore();
	}
});
