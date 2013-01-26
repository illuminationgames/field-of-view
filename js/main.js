var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 600;

var MAP_WIDTH = 3200;
var MAP_HEIGHT = 2400;

var PLAYER_WIDTH = 50;
var PLAYER_HEIGHT = 100;
var PLAYER_START_X = 200;
var PLAYER_START_Y = 200;

var FRAME_DELAY = 20;

var BG_MAP_SRC = "art/map_placeholder1.png";
var PLAYER_SRC = "art/placeholderspritesheet_avatar.png";

var frameParser;
var frame_count = 0;

Crafty.sprite(1, BG_MAP_SRC, {
	map: [0, 0, MAP_WIDTH, MAP_HEIGHT]
});

Crafty.sprite(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SRC, {
	player: [0, 0]
});

window.onload = function () {
    //start crafty
    Crafty.init(SCREEN_WIDTH, SCREEN_HEIGHT);	// currently using DOM
    //Crafty.canvas.init();
	
	//automatically play the loading scene
	Crafty.scene("loading");
};

//the loading screen that will display while our assets load
Crafty.scene("loading", function () {
	console.log("in loading");
    //load takes an array of assets and a callback when complete
    Crafty.load([BG_MAP_SRC, PLAYER_SRC], function () {
        Crafty.scene("main"); //when everything is loaded, run the main scene
    });

    //black background with some loading text
    Crafty.background("#000");
    Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: 150, y: 120 })
            .text("Loading")
            .css({ "text-align": "center" });
});

Crafty.scene("main", function () {
    console.log("in main");
	generateWorld();
	
	frameDelay = Crafty.e('Delay');
	frameDelay.delay(eachFrame, FRAME_DELAY);
});

//method to generate the map
function generateWorld() {
	// create a giant map at 0, 0, and z-pos 1, lowest (I think)
	Crafty.e("2D, DOM, map").attr({x: 0, y: 0, z: 1});
	
	Crafty.c("playerControls", {
		init: function() {
			this.requires('Fourway');
		},
		playerMove: function(speed) {
			this.fourway(speed);
			return this;
		}
	});
	
	Crafty.c("playerAnim", {
		init: function() {
		  this.requires('SpriteAnimation, Grid')
			  .animate('stand', 0, 0, 1)
			  .animate('walk', 1, 0, 3)
		}
	});
	
	//create our player entity
	var player1 = Crafty.e("2D, DOM, player, playerAnim, playerControls")
        .attr({ x: PLAYER_START_X, y: PLAYER_START_Y, z: 1 });
	
	player1.fourway(5);
	player1.bind("NewDirection",
				function (direction) {
					if (direction.x != 0 && direction.y != 0) {
						if (!this.isPlaying("walk"))
							this.stop().animate("walk", 20, -1);
					}
					/*if (direction.x > 0) {
						if (!this.isPlaying("walk_right"))
							this.stop().animate("walk_right", 10, -1);
					}
					if (direction.y < 0) {
						if (!this.isPlaying("walk_up"))
							this.stop().animate("walk_up", 10, -1);
					}
					if (direction.y > 0) {
						if (!this.isPlaying("walk_down"))
							this.stop().animate("walk_down", 10, -1);
					}*/
					else if(!direction.x && !direction.y) {
						this.stop().animate("stand", 200, -1);
					}
				});
	
	// create the camera
//	Crafty.viewport.init(SCREEN_WIDTH, SCREEN_HEIGHT);
//	Crafty.viewport.follow(player1, 0, 0);
}


function eachFrame() {
	// console.log("Frame " + frame_count);
	frame_count++;
	frameDelay.delay(eachFrame, FRAME_DELAY);
	
}

