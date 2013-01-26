function HeartbeatCanvas() {
	//console.log('hb-init');
	this.canvasElem = $('<canvas id="hb-canvas" width="1600" height="1200">').appendTo('#cr-stage');
	this.canvasElem.css({
		position: 'absolute',
		zIndex: 2
	});
	this.moveTo(400,300);
	this.ctx = this.canvasElem[0].getContext('2d');
}

$.extend(HeartbeatCanvas.prototype, {
	moveTo: function(x, y) {
		//console.log('hb-moveto',x,y);
		this.canvasElem.css({
			left: x - 800,
			top: y - 600
		});
	},
	draw: function() {
		//console.log('hb-draw');
		var ctx = this.ctx;
		ctx.save();
		ctx.strokeStyle = '#FF0000';
		ctx.beginPath();
		ctx.arc(800, 600, 200, 0, Math.PI * 2);
		ctx.closePath();
		ctx.stroke();
	}
});
