var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 600;
var MAP_WIDTH = 3200;
var MAP_HEIGHT = 2400;
var TILE_WIDTH = 50;
var TILE_HEIGHT = 50;


var PLAYER_WIDTH = 50;
var PLAYER_HEIGHT = 100;

var GOAL_X = 3000;
var GOAL_Y = 3000;
var PLAYER_START_X = 200;
var PLAYER_START_Y = 200;

var FRAME_DELAY = 20;

var DOM_OR_CANVAS = "DOM";

var BG_MAP_SRC = "art/map_placeholder1.png";
var PLAYER_SRC = "art/placeholderspritesheet_avatar.png";
var TILEMAP_SRC = "art/placeholder_streettiles.png";
var MAP_SRC = "map/test.json";

// globals
var player;
var ctx;

var frameParser;
var frame_count = 0;


/**
Build our sprites below
*/


Crafty.sprite(1, BG_MAP_SRC, {
	map: [0, 0, MAP_WIDTH, MAP_HEIGHT]
});

Crafty.sprite(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SRC, {
	player: [0, 0]
});

Crafty.sprite(TILE_WIDTH, TILE_HEIGHT, TILEMAP_SRC, {
	street1: [0, 0],
	street2: [1, 0],
	sidewalk1: [0, 1],
	sidewalk2: [1, 1],
	sidewalk3: [3, 1],
	sidewalk4: [4, 1],
	sidewalk5: [5, 1],
	sidewalk6: [6, 1],
	sidewalk7: [7, 1],
	sidewalk8: [8, 1],
	alley1: [0, 2],
	alley2: [1, 2],
	clutter: [0, 3],
	safe: [0, 4]
});

/**
The function called to begin Crafty
*/
window.onload = function () {
    //start crafty
    Crafty.init(MAP_WIDTH, MAP_HEIGHT);	// currently using DOM
	
	//automatically play the loading scene
	Crafty.scene("loading");
};


/**
the loading screen that will display while our assets load
*/
Crafty.scene("loading", function () {
	console.log("in loading");
    //load takes an array of assets and a callback when complete
    Crafty.load([BG_MAP_SRC, PLAYER_SRC, TILEMAP_SRC], function () {
        Crafty.scene("main"); //when everything is loaded, run the main scene
    });

    //black background with some loading text
    Crafty.background("#000");
    Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: 150, y: 120 })
            .text("Loading")
            .css({ "text-align": "center" });
});


/**
The initialization function for our main scene.
*/
Crafty.scene("main", function () {
    console.log("in main");	
	
	// create the camera
	Crafty.viewport.init(SCREEN_WIDTH, SCREEN_HEIGHT);
	//Crafty.viewport.mouselook(true);
	
	generateWorld();
	Crafty.viewport.follow(player, 1, 1);

	frameDelay = Crafty.e('Delay');
	frameDelay.delay(eachFrame, FRAME_DELAY);
	
	// load the JSON map file and call generateMap when it does
	$.getJSON(MAP_SRC, generateMap);
	
});

//method to generate the map
function generateWorld() {
	// create a giant map at 0, 0, and z-pos 1, lowest (I think)
	Crafty.e("2D, " + DOM_OR_CANVAS + ", map").attr({x: 0, y: 0, z: 1});
	
	Crafty.c("playerControls", {
		init: function() {
			this.requires('Fourway');
		},
		playerMove: function(speed) {
			this.fourway(speed);
			return this;
		}
	});
	
	//create our player entity

	Crafty.c("playerAnim", {
		init: function() {
		  this.requires('SpriteAnimation, Grid')
			  .animate('stand', 0, 0, 0)
			  .animate('walk', 0, 0, 2)
		}
	});
	
	player = Crafty.e("2D, DOM, player, playerAnim, playerControls")
        .attr({ x: PLAYER_START_X, y: PLAYER_START_Y, z: 1 });
	player.fourway(4);
	
	player.bind("NewDirection",
				function (direction) {
					if (direction.x != 0 || direction.y != 0) {
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
						this.stop().animate("stand", 20, -1);
					}
				});
	
	player.bind('Moved', function(from) {
			// draw a thing after the player
	
				//Crafty.viewport.centerOn(player, 1);
				/*if(this.hit('solid')){
					this.attr({x: from.x, y:from.y});
				}*/
				hbCanvas.moveTo(this._x + this._w / 2 + Crafty.viewport.x, this._y + this._h / 2 + Crafty.viewport.y)
			})

	window.hbCanvas = new HeartbeatCanvas();
	hbCanvas.moveTo(player._x + player._w / 2 + Crafty.viewport.x, player._y + player._h / 2 + Crafty.viewport.y)
	hbCanvas._draw();
	hbCanvas.setPulse(60);
}


/**
Function to load the map file
*/
function generateMap(json){
	// test whether the map has been loaded
	console.log(json);
}

/**
Helper function called on each frame
*/
function eachFrame() {
	// console.log("Frame " + frame_count);
	frame_count++;
	frameDelay.delay(eachFrame, FRAME_DELAY);
}

