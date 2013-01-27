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
var SHADOW_OFFSET = 87;
var FOOTPRINT_WIDTH = 30;
var FOOTPRINT_HEIGHT = 30;
var FOOTPRINT_OFFSETX = 10;
var FOOTPRINT_OFFSETY = 75;

var GOAL_X = 3000;
var GOAL_Y = 3000;
var PLAYER_START_X = 0;
var PLAYER_START_Y = 1145;
var HOME_X = 61;
var HOME_Y = 13;

var FRAME_DELAY = 20;

var DOM_OR_CANVAS = "DOM";

var BG_MAP_SRC = "art/CITY_final.png";
var BG_FLOAT_SRC = "art/CITY_FLOAT_final.png";
var PLAYER_SRC = "art/avespritesheet.png";
var SHADOW_SRC = "art/placeholder_shadow.png";
var ENEMY_SRC = "art/wolfspritesheet.png";
var TILEMAP_SRC = "art/placeholder_streettiles.png";
var ENEMYRANGE_SRC = "art/enemy_radius.png";
var ENEMYMINORRANGE_SRC = "art/enemy_minorradius.png";
var MAP_SRC = "map/field-view-map1.json";
var SHOW_ENEMY_RADII = false;

// damage variables
var PLAYER_MAX_HEALTH = 250;
var PLAYER_CURRENT_HEALTH = 250;
var PLAYER_LOSE_LIMIT = 50;
var ENEMY_SCARE_RADIUS = 100;
var ENEMY_EFFECT_RADIUS = 200;
var ENEMY_DISTANCE_MULTIPLIER = .2;
var IS_ENEMY_PERCENT = .3;
var SELF_DEFENSE_TIMEOUT = 3000;
var SELF_DEFENSE_LENGTH = 500;
var DEFENSE_SUCCESS_RATE = .75;
var FIRST_DEFENSE = true;

var PLAYER_LOSE_HEALTH_RATE = 10;
var PLAYER_LOSE_HEALTH_RATE_ALLEY = 3;
var PLAYER_LOSE_HEALTH_DELAY = 500;
var PLAYER_GAIN_HEALTH_RATE = 10;
var PLAYER_GAIN_HEALTH_DELAY = 500;
var ENEMY_JUMP_SCARE_LOSS = 50;
var SELF_DEFENSE_REGEN_RATE = .75;

// states
var inEnemyRange = false;
var inAlley = false;
var inSafeArea = false;
var scaringEnemy = null; // What enemy is currently scaring us?
var scareTime = null; // When did the scare happen?
var isDefending = false;

// end state
var WIN_OR_LOSE = 0;	// 1 for win, -1 for lose

// globals
var player;
var ctx;
var enemies;
var enemiesByRadius;

var frameParser;
var frame_count = 0;

var doonce = 0;
var seenInstructions = false;

/**
Build our sprites below
*/


Crafty.sprite(1, BG_MAP_SRC, {
	map: [0, 0, MAP_WIDTH, MAP_HEIGHT]
});

Crafty.sprite(1, BG_FLOAT_SRC, {
	map_float: [0, 0, MAP_WIDTH, MAP_HEIGHT]
});

Crafty.sprite(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SRC, {
	player: [0, 0]
});

Crafty.sprite(ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SRC, {
	enemy: [0, 0]
});

Crafty.sprite(ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_SRC, {
	person: [0, 0]
});

Crafty.sprite(SHADOW_WIDTH, SHADOW_HEIGHT, SHADOW_SRC, {
	shadow: [0, 0]
});

if (SHOW_ENEMY_RADII) {
	Crafty.sprite(200, 200, ENEMYRANGE_SRC, {
		enemy_range: [0, 0]
	});

	Crafty.sprite(400, 400, ENEMYMINORRANGE_SRC, {
		enemy_minorrange: [0, 0]
	});
}

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
	var gamePos = $('#cr-stage').position();
	//$('#cr-instructions').css({'display': 'block'});
	$('#cr-instructions').css({top: gamePos.top, left: gamePos.left});

	$('#cr-instructions').on('click', function() {
		if(!seenInstructions){
			$('#cr-instructions').css({display: 'none'});
			seenInstructions = true;
			//start crafty
			Crafty.init(MAP_WIDTH, MAP_HEIGHT);	// currently using DOM
			
			// Load heartbeat overlay
			window.hbCanvas = new HeartbeatCanvas();
			
			//automatically play the loading scene
			Crafty.scene("loading");
		}
	});
};


/**
the loading screen that will display while our assets load
*/
Crafty.scene("loading", function () {
	console.log("in loading");
    //load takes an array of assets and a callback when complete, runs the main scene
    Crafty.load([BG_MAP_SRC, BG_FLOAT_SRC, PLAYER_SRC, ENEMY_SRC, TILEMAP_SRC, SHADOW_SRC, ENEMYRANGE_SRC], function () {
        Crafty.scene("main"); 
    });

    //black background with some loading text
    Crafty.background("#000");
    Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: SCREEN_WIDTH / 2 - 50, y: SCREEN_HEIGHT / 2 - 10 })
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

/**
The initialization function for the game over scene
*/
Crafty.scene("end", function () {
	console.log("Game ended");
	
	// did we win or lose?
	if(WIN_OR_LOSE == -1){
		// lost
		console.log("Game lost");
		var gamePos = $('#cr-stage').position();
		$('#cr-lose').css({'display': 'block'});
		console.log("Game top: " + gamePos.top + ", left: " + gamePos.left);
		$('#cr-lose').css({'top': gamePos.top, 'left': gamePos.left});
		
		Crafty.stop();
	}
	else{
		// won
		console.log("Game won");
		var gamePos = $('#cr-stage').position();
		$('#cr-win').css({'display': 'block'});
		console.log("Game top: " + gamePos.top + ", left: " + gamePos.left);
		$('#cr-win').css({'top': gamePos.top, 'left': gamePos.left});
		
		Crafty.stop();
	}
});

/**
Method generates a background map, a player character, a shadow (for collision), and an overlay layer.
*/
function generateWorld() {
	Crafty.e("2D, DOM, map").attr({x: 0, y: 0, z: 1});
	Crafty.e("2D, DOM, map_float").attr({x:0, y:0, z:15});
	
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
				.animate('defend', 10, 0, 10)
				.animate('walk', 1, 0, 4)
				.animate('huddled', 5, 0, 5)
				.animate('huddled_walk', 6, 0, 9);
		}
	});
	
	player = Crafty.e("2D, DOM, player, playerAnim, playerControls")
        .attr({ x: PLAYER_START_X, y: PLAYER_START_Y, z: 10 });
	player.fourway(4);
	shadow = Crafty.e("2D, DOM, shadow")
		.attr({ x: PLAYER_START_X, y: PLAYER_START_Y + SHADOW_OFFSET, z: 9 });
	footprint = Crafty.e("2D, Collision")
		.attr({ x: PLAYER_START_X + FOOTPRINT_OFFSETX, y: PLAYER_START_Y + FOOTPRINT_OFFSETY, w: FOOTPRINT_WIDTH, h: FOOTPRINT_HEIGHT });
	
	player.bind("NewDirection",
		function (direction) {
				if (isDefending)
					return;
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
		if (isDefending) {
			this.attr({_x: from.x, _y:from.y});
			return;
		}
		// move the shadow with the player
		shadow.x = player._x;
		shadow.y = player._y + SHADOW_OFFSET;
		footprint.x = player._x + FOOTPRINT_OFFSETX;
		footprint.y = player._y + FOOTPRINT_OFFSETY;


		// block handles objects the player can't just walk through
		if(footprint.hit('clutter') || footprint.hit('no_walk') 
			|| this._x < 0 || footprint._y < 0 || this._x > MAP_WIDTH - PLAYER_WIDTH || this._y > MAP_HEIGHT - PLAYER_HEIGHT){
			this.attr({_x: from.x, _y:from.y});
			shadow.attr({x: from.x, y:from.y + SHADOW_OFFSET});
			footprint.attr({x: from.x + FOOTPRINT_OFFSETX, y:from.y + FOOTPRINT_OFFSETY});
		}
						
		// block handles getting home safely
		if(player.hit('home')){
			//
			if(WIN_OR_LOSE != 1){
				WIN_OR_LOSE = 1;
				hbCanvas.setVisibility(0);
				Crafty.scene("end");
			}
		}
		
		var hitObject = footprint.hit('safe');
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
		hbCanvas.isSafe(inSafeArea);

		var footprintX = footprint._x + FOOTPRINT_WIDTH / 2;
		var footprintY = footprint._y + FOOTPRINT_HEIGHT / 2;

		// Check to see if we're being threatened by a new enemy, first
		if(hitObject = footprint.hit('enemy_range')){
			for(var ctr = 0; ctr < hitObject.length; ctr += 1){
				var obj = hitObject[ctr].obj;
				var checkEnemy = obj.enemy;
				//console.log("Checking threat: ", obj.has('enemy_range'), footprintX, footprintY, checkEnemy.canScare, checkEnemy.threatRadius);
				if(obj.has('enemy_range') && checkEnemy && checkEnemy.canScare && checkEnemy.threatRadius.containsPoint(footprintX, footprintY)) {
					// We have a new, scary enemy.  Do a jump scare and set scaring to true.
					checkEnemy.isScaring = true;
					scaringEnemy = checkEnemy;
					scareTime = Date.now();

					checkEnemy.canScare = false;
					checkEnemy.stop().animate("stand_wolf", 50, -1);
					// console.log("jump scare!", checkEnemy);
					hbCanvas.scare();

					playerLoseHealth(ENEMY_JUMP_SCARE_LOSS);
					break;
				}
			}
		}

		// If we're currently being threatened, make sure we're still in the enemy range
		if (scaringEnemy && !scaringEnemy.effectRadius.containsPoint(footprintX, footprintY)) {
			console.log("Unscared");
			scaringEnemy = null;
		}

		// If we're not currently being threatened, see if we're in range of an
		// actively-scary enemy
		if(!scaringEnemy && (hitObject = footprint.hit('enemy_minorrange'))){
			for(var ctr = 0; ctr < hitObject.length; ctr += 1){
				obj = hitObject[ctr].obj;
				checkEnemy = obj.enemy;
				//console.log("Checking minor threat: ", footprintX, footprintY, obj);
				if(obj.has('enemy_minorrange') && checkEnemy && checkEnemy.isScaring && checkEnemy.effectRadius.containsPoint(footprintX, footprintY)) {
					console.log("Re-scare",checkEnemy);
					scaringEnemy = checkEnemy;
					break;
				}
			}
		}


		// block handles danger zones
		if (scaringEnemy) {
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
			if (inEnemyRange) {
				console.log("out of range",footprint.x,footprint.y);
			}
			inAlley = false;
			inEnemyRange = false;
			if (!this.isPlaying("walk"))
				this.stop().animate("walk", 20, -1);
		}
		
		this.setSpeed(inEnemyRange, inAlley);
		
		this.syncCanvas(hbCanvas);
	})

	player.syncCanvas = function(hbCanvas) {
		hbCanvas.moveTo(this._x + this._w / 2 + Crafty.viewport.x, this._y + this._h / 3 + Crafty.viewport.y)
		hbCanvas.setHomeDirection(HOME_X * 50 - this._x, HOME_Y * 50 - this._y);
	}

	player.setSpeed = function(enemy, alley) {
		var curspeed, speed;
		curspeed = this._speed.x;
		if (enemy) {
			speed = 6;
		} else if (alley) {
			speed = 5;
		} else {
			speed = 4;
		}
		if (curspeed != speed) {
			this._speed = {x: speed, y: speed};
			this.speed(this._speed);
			this._movement.x *= speed / curspeed;
			this._movement.y *= speed / curspeed;
		}
	}

	player.bind('KeyDown', 
		function(e) {
			if (e.key == Crafty.keys['SPACE'] && player._movement.x == 0 && player._movement.y == 0) {
				console.log("Defending", scaringEnemy, scareTime, Date.now() - (scareTime || 0));
				if (scaringEnemy && scareTime && Date.now() < scareTime + SELF_DEFENSE_TIMEOUT) {
					var defenseSuccessful = (FIRST_DEFENSE || Math.random() < DEFENSE_SUCCESS_RATE);
					hbCanvas.defend(defenseSuccessful);
					if (defenseSuccessful) {
						FIRST_DEFENSE = false;
						scaringEnemy.isScaring = false;
						scaringEnemy.stop().animate("stand_normal", 500, -1);
						inEnemyRange = false;
						player.setSpeed(inEnemyRange, inAlley);
					}
					playerGainHealth(ENEMY_JUMP_SCARE_LOSS * SELF_DEFENSE_REGEN_RATE);
					scaringEnemy = null;
				}

				player.stop().animate("defend", 20, -1);
				isDefending = true;
				window.setTimeout(function() {
					isDefending = false;
					player.trigger("NewDirection", player._movement);
				}, SELF_DEFENSE_LENGTH);
			}
		});

	window.setTimeout(function() {
		player.syncCanvas(hbCanvas);
		hbCanvas.setVisibility(250);	// 50 is game over limit
	}, 1);
	
	// initialize our list of enemies
	enemies = new Array();
	enemiesByRadius = new Object();
}


/**
Function to load the map file and generate obstacles, safe spaces, and enemies.
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
	
	// create an enemy animation object
	Crafty.c("enemyAnim", {
		init: function() {
		  this.requires('SpriteAnimation, Collision, Grid')
				.animate('stand_normal', 0, 0, 1)
				.animate('stand_wolf', 2, 0, 3);
		}
	});
	
	
	var ctr = 0;
	// initialize the safe, can't-walk-here, and enemy blocks
	for(var row = 0; row < mapHeight; row += 1){
		for(var col = 0; col < mapWidth; col += 1){
			var minX = col * TILE_WIDTH;
			var minY = row * TILE_HEIGHT;
			
			// place a safe zone, an alley, or a no-walk (dumpster)
			var tileNum = groundData[ctr]
			if(tileNum == 33){
				Crafty.e("2D, safe").
					attr({x: minX, y: minY, z: 1});
			}
			else if(tileNum == 17 || tileNum == 18){
				Crafty.e("2D, alley").
					attr({x: minX, y: minY, z: 1});
			}
			else if(tileNum == 25){
				Crafty.e("2D, no_walk")
					.attr({x: minX, y: minY, z: 1});
			}
			
			// place a no-walk barrier or home
			tileNum = noWalkData[ctr];
			if(tileNum == 34){
				Crafty.e("2D, no_walk")
					.attr({x: minX, y: minY, z: 1});
			}
			else if(tileNum == 40){
				Crafty.e("2D, home")
					.attr({x: minX, y:minY, z: 1});
			}
			
			// place an enemy
			tileNum = enemyData[ctr];
			var isEnemy = Math.random();
			if(tileNum == 102 || (tileNum == 107 && isEnemy < IS_ENEMY_PERCENT)){
				var enemy = Crafty.e("2D, DOM, enemy, enemyAnim")
						.attr({x: minX, y: minY, z: 1});

				enemy.animate("stand_normal", 500, -1);
				enemy.canScare = true;
				enemy.isScaring = false;
				
				// create a "radius of enmity" around the enemy's center
				var centerX = minX + TILE_WIDTH / 2;
				var centerY = minY + TILE_HEIGHT * 3 / 2;
				var offsetX = centerX - ENEMY_EFFECT_RADIUS;
				var offsetY = centerY - ENEMY_EFFECT_RADIUS;
				var displayClass = SHOW_ENEMY_RADII ? "DOM, " : ""
				var effectrange = Crafty.e("2D, "+displayClass+" enemy_minorrange")
						.attr({w: ENEMY_EFFECT_RADIUS * 2, h: ENEMY_EFFECT_RADIUS * 2, x: centerX - ENEMY_EFFECT_RADIUS, y: centerY - ENEMY_EFFECT_RADIUS, z: 2});
				var threatrange = Crafty.e("2D, "+displayClass+" enemy_range")
						.attr({w: ENEMY_SCARE_RADIUS * 2, h: ENEMY_SCARE_RADIUS * 2, x: centerX - ENEMY_SCARE_RADIUS, y: centerY - ENEMY_SCARE_RADIUS, z: 2});
				threatrange.enemy = enemy;
				effectrange.enemy = enemy;

				// Set circular radii for scare/continuing effect
				enemy.threatRadius = new Crafty.circle(centerX, centerY, ENEMY_SCARE_RADIUS + FOOTPRINT_WIDTH / 2);
				enemy.effectRadius = new Crafty.circle(centerX, centerY, ENEMY_EFFECT_RADIUS + FOOTPRINT_WIDTH / 2);
			}
			else if(tileNum == 107){
				var person = Crafty.e("2D, DOM, person, enemyAnim")
					.attr({x: minX, y:minY, z: 1});
				person.animate("stand_normal", 500, -1);	
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
Helper function drops player health by an amount, returns true if player lost
*/
function playerLoseHealth(amount) {
	PLAYER_CURRENT_HEALTH = Math.max(PLAYER_LOSE_LIMIT - 1, PLAYER_CURRENT_HEALTH - amount);
	hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
			
	if(PLAYER_CURRENT_HEALTH < PLAYER_LOSE_LIMIT){
		// lose
		WIN_OR_LOSE = -1;
		inEnemyRange = false;
		inAlley = false;
		hbCanvas.setVisibility(0);
		Crafty.scene("end");
		return true;
	}
	return false;
}

/**
Helper function increases player health by an amount
*/
function playerGainHealth(amount) {
	PLAYER_CURRENT_HEALTH = Math.min(PLAYER_MAX_HEALTH, PLAYER_CURRENT_HEALTH + amount);
	hbCanvas.setVisibility(PLAYER_CURRENT_HEALTH);
}


/**
Helper function sets player health down each second
*/
function healthDownBySec(){
	//console.log("Health down to " + PLAYER_CURRENT_HEALTH);
	if(inEnemyRange){
		if (!playerLoseHealth(PLAYER_LOSE_HEALTH_RATE)) {
			frameDelay.delay(healthDownBySec, PLAYER_LOSE_HEALTH_DELAY);
		}
	}
	else if(inAlley){
		if (!playerLoseHealth(PLAYER_LOSE_HEALTH_RATE_ALLEY)) {
			frameDelay.delay(healthDownBySec, PLAYER_LOSE_HEALTH_DELAY);
		}
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
		playerGainHealth(PLAYER_GAIN_HEALTH_RATE);
	
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

