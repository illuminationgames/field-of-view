var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 600;
var MAP_WIDTH = 3200;
var MAP_HEIGHT = 2400;
var TILE_WIDTH = 50;
var TILE_HEIGHT = 50;
var TILEMAP_ACROSS = 8;
var TILEMAP_DOWN = 5;

var PLAYER_WIDTH = 50;
var PLAYER_HEIGHT = 100;
var ENEMY_WIDTH = 50;
var ENEMY_HEIGHT = 100;
var SHADOW_WIDTH = 50;
var SHADOW_HEIGHT = 13;

var GOAL_X = 3000;
var GOAL_Y = 3000;
var PLAYER_START_X = 0;
var PLAYER_START_Y = 1150;
var HOME_X = 61;
var HOME_Y = 13;

var FRAME_DELAY = 20;

var DOM_OR_CANVAS = "DOM";

var BG_MAP_SRC = "art/field-view-1.png";
var PLAYER_SRC = "art/avespritesheet.png";
var SHADOW_SRC = "art/placeholder_shadow.png";
var ENEMY_SRC = "art/placeholderspritesheet_npc.png";
var TILEMAP_SRC = "art/placeholder_streettiles.png";
var ENEMYRANGE_SRC = "art/enemy_radius.png";
var MAP_SRC = "map/field-view-map1.json";

// damage variables
var PLAYER_MAX_HEALTH = 250;
var PLAYER_CURRENT_HEALTH = 250;
var PLAYER_LOSE_LIMIT = 49;
var ENEMY_EFFECT_RADIUS = 100;
var ENEMY_DISTANCE_MULTIPLIER = .2;

var PLAYER_LOSE_HEALTH_RATE = 10;
var PLAYER_LOSE_HEALTH_RATE_ALLEY = 3;
var PLAYER_LOSE_HEALTH_DELAY = 500;
var PLAYER_GAIN_HEALTH_RATE = 10;
var PLAYER_GAIN_HEALTH_DELAY = 500;
var ENEMY_JUMP_SCARE_LOSS = 50;

// states
var inEnemyRange = false;
var inAlley = false;
var inSafeArea = false;

// globals
var player;
var ctx;
var enemies;
var enemiesByRadius;

var frameParser;
var frame_count = 0;

var doonce = 0;

/**
Build our sprites below
*/


Crafty.sprite(1, BG_MAP_SRC, {
	map: [0, 0, MAP_WIDTH, MAP_HEIGHT]
});

Crafty.sprite(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SRC, {
	player: [0, 0]
});

Crafty.sprite(ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SRC, {
	enemy: [0, 0]
});

Crafty.sprite(SHADOW_WIDTH, SHADOW_HEIGHT, SHADOW_SRC, {
	shadow: [0, 0]
});

Crafty.sprite(200, 200, ENEMYRANGE_SRC, {
	enemy_range: [0, 0]
});

Crafty.sprite(TILE_WIDTH, TILE_HEIGHT, TILEMAP_SRC, {
	street1: [0, 0],
	street2: [1, 0],
	sidewalk1: [0, 1],
	sidewalk2: [1, 1],
	sidewalk3: [2, 1],
	sidewalk4: [3, 1],
	sidewalk5: [4, 1],
	sidewalk6: [5, 1],
	sidewalk7: [6, 1],
	sidewalk8: [7, 1],
	alley1: [0, 2],
	alley2: [1, 2],
	clutter: [0, 3],
	safe: [0, 4],
	no_walk: [1, 4]
});

var TILE_LIST = new Array(new Array("street1", "street2"), 
						new Array("sidewalk1", "sidewalk2", "sidewalk3", "sidewalk4", "sidewalk5", "sidewalk6", "sidewalk7", "sidewalk8"),
						new Array("alley1", "alley2"), 
						new Array("clutter"),
						new Array("safe"));

var TILELABEL_LIST = new Array(new Array("street", "street"), 
						new Array("sidewalk", "sidewalk", "sidewalk", "sidewalk", "sidewalk", "sidewalk", "sidewalk", "sidewalk"),
						new Array("alley", "alley"), 
						new Array("clutter"),
						new Array("safe"));

/**
The function called to begin Crafty
*/
window.onload = function () {
    //start crafty
    Crafty.init(MAP_WIDTH, MAP_HEIGHT);	// currently using DOM
	
	// Load heartbeat overlay
	window.hbCanvas = new HeartbeatCanvas();
	
	//automatically play the loading scene
	Crafty.scene("loading");
};


/**
the loading screen that will display while our assets load
*/
Crafty.scene("loading", function () {
	console.log("in loading");
    //load takes an array of assets and a callback when complete, runs the main scene
    Crafty.load([BG_MAP_SRC, PLAYER_SRC, ENEMY_SRC, TILEMAP_SRC, SHADOW_SRC, ENEMYRANGE_SRC], function () {
        Crafty.scene("main"); 
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
	Crafty.viewport.clampToEntities = true;
	Crafty.viewport.mouselook(true);
	
	generateWorld();
	Crafty.viewport.follow(player, 1, 1);

	frameDelay = Crafty.e('Delay');
	
	// load the JSON map file and call generateMap when it does
	$.getJSON(MAP_SRC, generateMap);
	
});

//method to generate the map
function generateWorld() {
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
	
	//create player entity
	Crafty.c("playerAnim", {
		init: function() {
		  this.requires('SpriteAnimation, Collision, Grid')
			  .animate('stand', 0, 0, 0)
			  .animate('walk', 1, 0, 4)
			  .animate('huddled', 5, 0, 5)
			  .animate('huddled_walk', 6, 0, 9);
		}
	});
	
	player = Crafty.e("2D, DOM, player, playerAnim, playerControls")
        .attr({ x: PLAYER_START_X, y: PLAYER_START_Y, z: 10 });
	player.fourway(4);
	shadow = Crafty.e("2D, DOM, shadow, Collision")
		.attr({ x: PLAYER_START_X, y: PLAYER_START_Y + 87, z: 9 });
	
	player.bind("NewDirection",
		function (direction) {
				if(direction.x > 0)
					this.flip('X');
				else if(direction.x < 0)
					this.unflip('X');
		
			if (direction.x != 0 || direction.y != 0) {
				if(inEnemyRange || inAlley){
					if (!this.isPlaying("huddled_walk"))
						this.stop().animate("huddled_walk", 20, -1);
				}
				else{
					if (!this.isPlaying("walk"))
						this.stop().animate("walk", 20, -1);
				}
			}
			else if(!direction.x && !direction.y) {
				if(inEnemyRange || inAlley)
					this.stop().animate("huddled", 20, -1);
				else
					this.stop().animate("stand", 20, -1);
			}
		});
	
	player.bind('Moved', function(from) {
		// move the shadow with the player
		shadow.x = player.x;
		shadow.y = player.y + 87;


		// block handles objects the player can't just walk through
		if(shadow.hit('clutter') || shadow.hit('no_walk') 
			|| this.x < 0 || shadow.y < 0 || this.x > MAP_WIDTH - PLAYER_WIDTH || this.y > MAP_HEIGHT - PLAYER_HEIGHT){
			this.attr({x: from.x, y:from.y});
			shadow.attr({x: from.x, y:from.y + 87});
		}
		
		var hitObject = shadow.hit('safe');
		// block handles safe spaces
		if(hitObject){
			if(!inSafeArea){
				inSafeArea = true;
				healthUpBySec(PLAYER_GAIN_HEALTH_RATE);
			}
		}
		else{
			inSafeArea = false;
		}
		
		// block handles danger zones
		if(hitObject = shadow.hit('enemy_range')){
			if(!inEnemyRange){
				inEnemyRange = true;
				healthDownBySec();
			}
			if (!this.isPlaying("huddled_walk"))
				this.stop().animate("huddled_walk", 20, -1);
		}
		else if(hitObject = player.hit('alley')){
			if(!inAlley){
				inAlley = true;
				healthDownBySec();
			}
			if (!this.isPlaying("huddled_walk"))
				this.stop().animate("huddled_walk", 20, -1);
		}
		else{
			inAlley = false;
			inEnemyRange = false;
			if (!this.isPlaying("walk"))
				this.stop().animate("walk", 20, -1);
		}
		
		// block handles enemy jump scare
		if(hitObject = shadow.hit('enemy')){
			for(var ctr = 0; ctr < hitObject.length; ctr += 1){
				var obj = hitObject[ctr].obj;
				if(obj.has('enemy')){
					// jump scare
					if(typeof obj.jumpScare === "undefined"){
						obj.jumpScare = true;
						console.log("jump scare!");
						PLAYER_CURRENT_HEALTH = Math.max(PLAYER_LOSE_LIMIT, PLAYER_CURRENT_HEALTH - ENEMY_JUMP_SCARE_LOSS);
						hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
					}
				}
			}
		}
				
		// block handles getting home safely
		if(player.hit('home')){
			
		}
		
		this.syncCanvas(hbCanvas);
	})

	player.syncCanvas = function(hbCanvas) {
		hbCanvas.moveTo(this._x + this._w / 2 + Crafty.viewport.x, this._y + this._h / 3 + Crafty.viewport.y)
		hbCanvas.setHomeDirection(HOME_X * 50 - this._x, HOME_Y * 50 - this._y);
	}

	window.setTimeout(function() {
		player.syncCanvas(hbCanvas);
		hbCanvas.setVisibility(250);	// 50 is game over limit
	}, 1);
	
	// initialize our list of enemies
	enemies = new Array();
	enemiesByRadius = new Object();
}


/**
Function to load the map file
*/
function generateMap(json){
	// test whether the map has been loaded
	var mapLayer1 = json.layers[0];
	var mapWidth = mapLayer1.width;
	var mapHeight = mapLayer1.height;
	
	var groundData = json.layers[0].data;
	var noWalkData = json.layers[1].data;
	var enemyData = json.layers[2].data;
	
	MAP_WIDTH = mapWidth * TILE_WIDTH;
	MAP_HEIGHT = mapHeight * TILE_HEIGHT;
	
	var ctr = 0;
	// initialize the safe, can't-walk-here, and enemy blocks
	for(var row = 0; row < mapHeight; row += 1){
		for(var col = 0; col < mapWidth; col += 1){
			var minX = col * TILE_WIDTH;
			var minY = row * TILE_HEIGHT;
			
			// place a safe zone or an alley
			var tileNum = groundData[ctr]
			if(tileNum == 33){
				Crafty.e("2D, safe").
					attr({x: minX, y: minY, z: 1});
			}
			else if(tileNum == 17 || tileNum == 18){
				Crafty.e("2D, alley").
					attr({x: minX, y: minY, z: 1});
			}
			
			// place a no-walk barrier
			tileNum = noWalkData[ctr];
			if(tileNum != 0){
				Crafty.e("2D, no_walk")
					.attr({x: minX, y: minY, z: 1});
			}
			
			// place an enemy
			tileNum = enemyData[ctr];
			if(tileNum == 102){
				var enemy = Crafty.e("2D, DOM, enemy")
						.attr({x: minX, y: minY, z: 1});
				
				// create a "radius of enmity" around the enemy's center
				var offsetX = minX - (ENEMY_EFFECT_RADIUS - TILE_WIDTH / 2);
				var offsetY = minY - (ENEMY_EFFECT_RADIUS - TILE_HEIGHT / 2);
				Crafty.e("2D, DOM, enemy_range")
						.attr({x: offsetX, y: offsetY, z: 2});
			}
			
			ctr += 1;
		}
	}
}

/**
Helper function called on each frame
*/
function eachFrame() {
	// console.log("Frame " + frame_count);
	frame_count++;
	frameDelay.delay(eachFrame, FRAME_DELAY);
}


/**
Helper function sets player health down each second
*/
function healthDownBySec(){
	//console.log("Health down to " + PLAYER_CURRENT_HEALTH);
	if(inEnemyRange){
		PLAYER_CURRENT_HEALTH = Math.max(PLAYER_LOSE_LIMIT, PLAYER_CURRENT_HEALTH - PLAYER_LOSE_HEALTH_RATE);
		hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
		frameDelay.delay(healthDownBySec, PLAYER_LOSE_HEALTH_DELAY);
	}
	else if(inAlley){
		PLAYER_CURRENT_HEALTH = Math.max(PLAYER_LOSE_LIMIT, PLAYER_CURRENT_HEALTH - PLAYER_LOSE_HEALTH_RATE_ALLEY);
		hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
		frameDelay.delay(healthDownBySec, PLAYER_LOSE_HEALTH_DELAY);
	}
	else{
		return;
	}
}

/**
Helper function sets player health gain each second
*/
function healthUpBySec(){
	//console.log("Health up to " + PLAYER_CURRENT_HEALTH);
	if(inSafeArea){
		PLAYER_CURRENT_HEALTH = Math.min(PLAYER_MAX_HEALTH, PLAYER_CURRENT_HEALTH + PLAYER_GAIN_HEALTH_RATE);
		hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
	
		frameDelay.delay(healthUpBySec, PLAYER_GAIN_HEALTH_DELAY);
	}
	else{
		return;
	}	
}


/**
Helper function converts a linear index to an array containing [row, col] coordinates, given the width and height of the array.
*/
function linToRowCol(linIndex, width, height){
	var row = Math.floor(linIndex / width);
	var col = linIndex % width;
	// console.log("linIndex: " + linIndex + ", row: " + row + ", col: " + col);
	
	return new Array(row, col);
}

/**
Helper function gets distance between two sets of x, y points
*/
function distance(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

