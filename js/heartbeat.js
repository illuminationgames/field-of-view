function HeartbeatCanvas() {
	//console.log('hb-init');
	this.width = 800;
	this.height = 600;
	this.backdrop = $('<div>').css({
		position:'absolute',
		zIndex:2,
		width:800,
		height:600
	}).appendTo('#cr-stage');
	this.canvasElem = $('<canvas id="hb-canvas" width="800" height="600">').appendTo(this.backdrop);
	this.lastDeltas = [];
	this._beatx = this._beaty = null;
	this.lampRadius = 100;
	this.lampOpacity = 1;
	this.moveTo(25,284);
	this.ctx = this.canvasElem[0].getContext('2d');
	this.beats = [];
	this.pulse = false;
	this.pulseDelay = 100;
	this._pulseInterval = false;
	this._pulseIntervalUpdate = false;
	this.lastFrame = false;
	this._hookCraftyTimer();
	this.beatSpeed = 200;
	this.targetVisibility = false;
	this.visSpeed = false;
	this.visibility = false;
	//this._setVisibility(this.beatMax);
	this.lastClone = -1;
	this._homeDirection = 0;
	this._soundsEnabled = false;
	this._lastScare = null;
	this._playerVoice = null;
	this._lastDefense = null;
	this._lamps = [];
	this._viewport = {x:10000, y:10000};
	// This should eventually get done dynamically
	this.addLamp(534, 250);
	this.addLamp(1636, 550);
	this.addLamp(1146, 925, 150);
	this.addLamp(915, 2150);
	this.addLamp(2600, 2075, 150);

	this._safe = false;
	this._loadSounds();
	this.randomizeVoice();
}

$.extend(HeartbeatCanvas.prototype, {
	_soundFiles: [
		// BGM
		'citynight',
		'serenity',

		/*
		// Time
		'clocktickhalf',
		'midnight',

		// Bad things
		'whistle1',
		'whistle2',
		'whistle3',
		'alleyguy',
		'carthrough',
		'darkvoices',
		'evildriver'
		*/
	],
	// Voice: [defenses, attacks]
	_voiceFiles: {
		1: [9, 0],
		2: [9, 9],
		3: [0, 9],
		4: [10, 9]
	},
	_hookCraftyTimer: function() {
		var oldStep = Crafty.timer.step;
		var self = this;
		function newStep() {
			oldStep.apply(Crafty.timer, arguments);
			self._animFrame(Date.now());
		}
		Crafty.timer.step = newStep;
	},
	_loadSounds: function() {
		var self = this;

		// (A custom verion of) lowLag is used for the heartbeats, because they have to be as instant as possible.
		lowLag.init({'urlPrefix':'audio/','debug':'none'});
		lowLag.load(["Heartbeat1.ogg","Heartbeat1.mp3"], 'Heartbeat1');
		lowLag.load(["Heartbeat2.ogg","Heartbeat2.mp3"], 'Heartbeat2');
		lowLag.load(["Heartbeat3.ogg","Heartbeat3.mp3"], 'Heartbeat3');

		// Buzz is used for all the other sounds, because it allows play/stop/etc and we don't need multiple instances.
		var maxVolume = 100;
		buzz.defaults.volume = maxVolume;
		this._sounds = {};
		$.each(this._soundFiles, function(_,name) {
			self._sounds[name] = self.limitVolume(maxVolume, new buzz.sound("audio/"+name, {
				formats: [ "ogg", "mp3" ]
			}));
		});
		this._voices = [];
		$.each(this._voiceFiles, function(name, counts) {
			var curVoice = {defenses: [], attacks: []};
			self._voices.push(curVoice);
			for (var n = 1; n <= counts[0]; n++) {
				curVoice.defenses.push(
					self.limitVolume(maxVolume, new buzz.sound("voices/voice"+name+"_defense"+n, {
						formats: [ "ogg", "mp3" ]
					}))
				);
			}
			for (var n = 1; n <= counts[1]; n++) {
				curVoice.attacks.push(
					self.limitVolume(maxVolume, new buzz.sound("voices/voice"+name+"_attack"+n, {
						formats: [ "ogg", "mp3" ]
					}))
				);
			}
		});
		buzz.all().load();
		this._sounds.citynight.loop();
		//this._sounds.serenity.loop();
	},
	limitVolume: function(volLimit, sound) {
		//sound._origFadeTo = sound.fadeTo;
		sound._origSetVolume = sound.setVolume;
		sound._volumeLimit = volLimit / 100;
		sound.setVolume = this._limitedSetVolume;
		//sound.fadeTo = this._limitedFadeTo;
		return sound;
	},
	_limitedSetVolume: function( volume ) {
		if ( volume < 0 ) {
			volume = 0;
		}
		if ( volume > 100 ) {
			volume = 100;
		}
	
		this.volume = volume;
		this.sound.volume = volume * this._volumeLimit / 100;
		return this;
	},
	_limitedFadeTo: function(to, duration, callback) {
		if ( duration instanceof Function ) {
				callback = duration;
				duration = buzz.defaults.duration;
		} else {
				duration = duration || buzz.defaults.duration;
		}
		return this._origFadeTo(to * this._volumeLimit, duration, callback);
	},
	randomizeVoice: function() {
		do {
			this._playerVoice = Math.floor(Math.random() * this._voices.length);
		} while (this._voices[this._playerVoice].defenses.length == 0);
	},
	moveTo: function(x, y) {
		//console.log('hb-moveto',x,y);
		this._beatx = x;
		this._beaty = y;
	},
	addLamp: function(x, y, radius) {
		this._lamps.push({x:x, y:y, radius: radius || this.lampRadius});
	},
	setViewport: function(x, y) {
		this._viewport.x = x;
		this._viewport.y = y;
	},
	disable: function() {
		this.setPulse(false);
		this.beats = [];
		this._setVisibility(false);
		this.disableSounds();
	},
	enableSounds: function() {
		this._sounds.citynight.play().fadeIn(500);
	},
	disableSounds: function() {
		this._sounds.citynight.stop();
		this._sounds.serenity.stop();
		//buzz.all().stop();
	},
	isSafe: function(safe) {
		var self = this;
		if (this._safe === null) {
			// During fadeout, wait
			return;
		}
		if (this._safe != safe) {
			console.log("Setting safe:",safe);
			if (safe) {
				this._sounds.serenity.fadeIn(1000).play();
				this._sounds.citynight.fadeTo(25,5000);
				this._safe = safe;
			} else {
				this._sounds.citynight.fadeTo(100, 300);
				this._safe = null;
				if (this._sounds.serenity.isEnded()) {
					this._sounds.serenity.stop();
					this._safe = safe;
				} else {
					this._sounds.serenity.fadeOut(300, function() { this.stop(); self._safe = safe;});
				}
			}
		}
	},
	scare: function() {
		var scare = this._lastScare;
		while (scare === this._lastScare) {
			var voice = Math.floor(Math.random() * this._voices.length);
			if (voice == this._playerVoice) continue;
			if (this._voices[voice].attacks.length == 0) continue;
			var which = Math.floor(Math.random() * this._voices[voice].attacks.length);
			scare = this._voices[voice].attacks[which];
		}
		this._lastScare = scare;
		scare.play();
	},
	defend: function(stopAttack) {
		if (this._lastScare && stopAttack) {
			this._lastScare.stop();
		}
		var defense = this._lastDefense;
		while (defense === this._lastDefense) {
			var which = Math.floor(Math.random() * this._voices[this._playerVoice].defenses.length);
			defense = this._voices[this._playerVoice].defenses[which];
		}
		this._lastDefense = defense;
		// Make a self-defense sound eventually
		defense.play();
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
			var maxRad = maxVis + 50;
			var sizeDef = 'circle '+maxRad+'px';
			var wkSizeDef = 'center center, '+maxRad+'px '+maxRad+'px';
			var gradDef = ', rgba(0,0,0,0) 0px';
			if (maxVis > 100)
				gradDef += ', rgba(0,0,0,0.2) 50px';
			gradDef += ', rgba(0,0,0,0.5) '+(maxVis-50)+'px';
			gradDef += ', rgba(0,0,0,0.9) '+maxVis+'px';
			gradDef += ', rgba(0,0,0,1) '+maxRad+'px';
                        /*
			this.backdrop.css('background-image', '-moz-radial-gradient('+sizeDef+gradDef+')');
			this.backdrop.css('background-image', '-webkit-radial-gradient('+wkSizeDef+gradDef+')');
			this.backdrop.css('background-image', '-o-radial-gradient('+sizeDef+gradDef+')');
			this.backdrop.css('background-image', 'radial-gradient('+sizeDef+gradDef+')');
                        */
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
				this.disableSounds();
			} else if (!this._pulseInterval) {
				this._pulseBeat();
				this.enableSounds();
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
		if (this.lastFrame === false) return;
		var delta = (timestamp - this.lastFrame) / 1000.0;
		this.lastFrame = timestamp;
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			var ratio = beat.radius / this.visibility;
			var multiplier = 1 - 0.5 * ratio
			beat.radius += delta * beat.speed * multiplier;
			beat.opacity = 0.8 - (0.75 * ratio * ratio);
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

		if (!this.beats.length) {
			this.lastFrame = false;
		}
	},
	_draw: function() {
		//console.log('hb-draw');
		var ctx = this.ctx;
		ctx.clearRect(0,0,800,600);

		ctx.save();
		var maxVis = this.visibility;
		var maxRad = maxVis + 50;
		/*
		var maxBeat = maxVis - 50;
		if (this.beats.length) {
			maxBeat = this.beats[0].radius;
		}
		*/
		//var sizeDef = 'circle '+maxRad+'px';
		//var wkSizeDef = 'center center, '+maxRad+'px '+maxRad+'px';
		var rgrad = ctx.createRadialGradient(this._beatx,this._beaty,0,this._beatx,this._beaty,maxRad);
		function addStop(pxrad, alpha) {
			rgrad.addColorStop(pxrad / maxRad, 'rgba(0,0,0,'+alpha+')');
		}
		if (maxVis >= 50) {
			addStop(0, 0);
			if (maxVis > 100)
				addStop(50, 0.2);
			/*
			addStop(maxBeat, 0.5);
			addStop((maxBeat + maxRad) / 2, 0.9);
			*/
			addStop(maxVis-50, 0.5);
			addStop(maxVis, 0.9);
			addStop(maxRad, 1);
			ctx.fillStyle = rgrad;
		} else {
			ctx.fillStyle = 'black';
		}
		ctx.fillRect(0,0,800,600);
		ctx.restore();
		var vp = this._viewport;

		for (var l = 0; l < this._lamps.length; l++) {
			var lamp = this._lamps[l];
			if (lamp.x+vp.x-lamp.radius > this.width || lamp.x+vp.x+lamp.radius < 0 || lamp.y+vp.y-lamp.radius > this.height || lamp.y+vp.y+lamp.radius < 0) continue;
			ctx.save();
			ctx.translate(lamp.x+vp.x-lamp.radius,lamp.y+vp.y-lamp.radius);
			ctx.globalCompositeOperation = 'destination-out';
			rgrad = ctx.createRadialGradient(lamp.radius, lamp.radius, 0, lamp.radius, lamp.radius, lamp.radius);
			rgrad.addColorStop(0, 'rgba(0,0,0,'+this.lampOpacity+')');
			rgrad.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = rgrad;
			ctx.fillRect(0,0,lamp.radius * 2,lamp.radius * 2);
			ctx.restore();
		}


		if (!this.beats.length) return;

		ctx.save();
		ctx.translate(this._beatx, this._beaty);
		for (var b = 0; b < this.beats.length; b++) {
			var beat = this.beats[b];
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(255,255,255,'+beat.opacity*.5+')';
			ctx.beginPath();
			ctx.arc(0, 0, beat.radius, 0, Math.PI * 2);
			ctx.closePath();
			ctx.stroke();

			ctx.lineWidth = 1.5;
			ctx.strokeStyle = 'rgba(255,255,255,1)';
			var arcWidth = Math.PI / 4 * beat.opacity;
			ctx.beginPath();
			ctx.arc(0, 0, beat.radius, this._homeDirection - arcWidth, this._homeDirection + arcWidth);
			ctx.stroke();
		}
		ctx.restore();
	}
});
