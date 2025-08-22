/**
 * Car Driving Simulator Game
 * A complete car driving game with traffic avoidance
 */

// Game state management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

// Game configuration - easy to modify game parameters
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    road: {
        width: 400,
        laneWidth: 100,
        lanes: 4
    },
    player: {
        width: 60,
        height: 100,
        speed: 5,
        maxSteer: 8
    },
    traffic: {
        spawnRate: 0.02,
        minSpeed: 2,
        maxSpeed: 6,
        width: 60,
        height: 100
    },
    difficulty: {
        speedIncrease: 0.5,
        spawnIncrease: 0.005,
        levelThreshold: 1000
    }
};

// Game variables
let canvas, ctx;
let gameState = GameState.MENU;
let animationId;

// Game objects
let player;
let trafficCars = [];
let roadOffset = 0;

// Game stats
let score = 0;
let distance = 0;
let level = 1;
let carsAvoidedCount = 0;
let gameSpeed = 3;
let trafficSpawnRate = CONFIG.traffic.spawnRate;

// Input handling
let keys = {};

// Car colors for variety
const CAR_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ffffff', '#888888'];

/**
 * Player car class - handles the player's vehicle
 */
class PlayerCar {
    constructor() {
        this.x = CONFIG.canvas.width / 2 - CONFIG.player.width / 2;
        this.y = CONFIG.canvas.height - CONFIG.player.height - 50;
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.speed = CONFIG.player.speed;
        this.targetX = this.x;
    }

    /**
     * Update player position based on input
     */
    update() {
        // Handle input with smooth steering
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.targetX -= CONFIG.player.maxSteer;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.targetX += CONFIG.player.maxSteer;
        }

        // Keep player within road bounds
        const roadLeft = (CONFIG.canvas.width - CONFIG.road.width) / 2;
        const roadRight = roadLeft + CONFIG.road.width - this.width;
        this.targetX = Math.max(roadLeft, Math.min(roadRight, this.targetX));

        // Smooth movement towards target position
        this.x += (this.targetX - this.x) * 0.15;
    }

    /**
     * Draw the player car with detailed sports car graphics
     */
    draw() {
        const centerX = this.x + this.width / 2;
        
        // Main car body - sleek red sports car
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x, this.y + 10, this.width, this.height - 20);
        
        // Car nose (front bumper)
        ctx.fillStyle = '#aa0000';
        ctx.fillRect(this.x + 5, this.y + this.height - 15, this.width - 10, 15);
        
        // Hood
        ctx.fillStyle = '#990000';
        ctx.fillRect(this.x + 8, this.y + this.height - 45, this.width - 16, 25);
        
        // Racing stripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(centerX - 3, this.y + 5, 6, this.height - 10);
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 1, this.y + 5, 2, this.height - 10);
        
        // Windshield
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(this.x + 8, this.y + 12, this.width - 16, 20);
        
        // Side windows
        ctx.fillStyle = '#6495ED';
        ctx.fillRect(this.x + 5, this.y + 35, 12, 25);
        ctx.fillRect(this.x + this.width - 17, this.y + 35, 12, 25);
        
        // Headlights - bright white LEDs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 8, this.y + this.height - 12, 12, 8);
        ctx.fillRect(this.x + this.width - 20, this.y + this.height - 12, 12, 8);
        
        // Headlight details
        ctx.fillStyle = '#ffff99';
        ctx.fillRect(this.x + 10, this.y + this.height - 10, 8, 4);
        ctx.fillRect(this.x + this.width - 18, this.y + this.height - 10, 8, 4);
        
        // Side mirrors
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - 2, this.y + 25, 4, 6);
        ctx.fillRect(this.x + this.width - 2, this.y + 25, 4, 6);
        
        // Wheels/Tires
        ctx.fillStyle = '#000000';
        // Front wheels
        ctx.fillRect(this.x - 3, this.y + this.height - 20, 8, 15);
        ctx.fillRect(this.x + this.width - 5, this.y + this.height - 20, 8, 15);
        // Rear wheels  
        ctx.fillRect(this.x - 3, this.y + 15, 8, 15);
        ctx.fillRect(this.x + this.width - 5, this.y + 15, 8, 15);
        
        // Wheel rims
        ctx.fillStyle = '#silver';
        // Front rims
        ctx.fillRect(this.x - 1, this.y + this.height - 17, 4, 9);
        ctx.fillRect(this.x + this.width - 3, this.y + this.height - 17, 4, 9);
        // Rear rims
        ctx.fillRect(this.x - 1, this.y + 18, 4, 9);
        ctx.fillRect(this.x + this.width - 3, this.y + 18, 4, 9);
        
        // Tail lights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 5, this.y + 5, 8, 6);
        ctx.fillRect(this.x + this.width - 13, this.y + 5, 8, 6);
        
        // Spoiler
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 10, this.y + 2, this.width - 20, 4);
        ctx.fillRect(this.x + 15, this.y, this.width - 30, 2);
    }

    /**
     * Get collision bounds for this car
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

/**
 * Traffic car class - handles AI-controlled vehicles
 */
class TrafficCar {
    constructor() {
        const roadLeft = (CONFIG.canvas.width - CONFIG.road.width) / 2;
        const laneIndex = Math.floor(Math.random() * CONFIG.road.lanes);
        
        // Position car in random lane
        this.x = roadLeft + laneIndex * CONFIG.road.laneWidth + (CONFIG.road.laneWidth - CONFIG.traffic.width) / 2;
        this.y = -CONFIG.traffic.height;
        this.width = CONFIG.traffic.width;
        this.height = CONFIG.traffic.height;
        this.speed = CONFIG.traffic.minSpeed + Math.random() * (CONFIG.traffic.maxSpeed - CONFIG.traffic.minSpeed);
        this.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
        this.passed = false; // Track if player has passed this car
    }

    /**
     * Update traffic car position and check if passed
     */
    update() {
        this.y += this.speed + gameSpeed;
        
        // Check if car has been passed by player (award points)
        if (!this.passed && this.y > player.y + player.height) {
            this.passed = true;
            score += 10;
            carsAvoidedCount++;
        }
    }

    /**
     * Draw the traffic car with varied colors and details
     */
    draw() {
        // Draw car body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Car details - darker shade of the main color
        const darkerColor = this.adjustBrightness(this.color, -40);
        ctx.fillStyle = darkerColor;
        ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, 20);
        ctx.fillRect(this.x + 5, this.y + this.height - 30, this.width - 10, 20);
        
        // Windows - dark gray
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x + 10, this.y + 15, this.width - 20, 15);
        ctx.fillRect(this.x + 10, this.y + this.height - 25, this.width - 20, 15);
    }

    /**
     * Utility function to adjust color brightness
     */
    adjustBrightness(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount);
        const R = (num >> 16) + amt;
        const B = (num >> 8 & 0x00FF) + amt;
        const G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
            (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + 
            (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    }

    /**
     * Get collision bounds for this car
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if car has moved off screen
     */
    isOffScreen() {
        return this.y > CONFIG.canvas.height;
    }
}

/**
 * Initialize the game - set up canvas and event listeners
 */
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up keyboard event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        e.preventDefault();
    });
}

/**
 * Start a new game - reset all variables and begin gameplay
 */
function startGame() {
    gameState = GameState.PLAYING;
    
    // Reset game state
    score = 0;
    distance = 0;
    level = 1;
    carsAvoidedCount = 0;
    gameSpeed = 3;
    trafficSpawnRate = CONFIG.traffic.spawnRate;
    roadOffset = 0;
    
    // Reset game objects
    player = new PlayerCar();
    trafficCars = [];
    
    // Hide menus and show HUD
    document.getElementById('startMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    // Start game loop
    gameLoop();
}

/**
 * Show the start menu
 */
function showStartMenu() {
    gameState = GameState.MENU;
    document.getElementById('startMenu').classList.remove('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

/**
 * End the game and show final statistics
 */
function gameOver() {
    gameState = GameState.GAME_OVER;
    
    // Update final stats display
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance);
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('carsAvoided').textContent = carsAvoidedCount;
    
    // Show game over menu
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

/**
 * Check collision between two rectangular objects
 */
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * Update game difficulty based on distance traveled
 */
function updateDifficulty() {
    const newLevel = Math.floor(distance / CONFIG.difficulty.levelThreshold) + 1;
    
    if (newLevel > level) {
        level = newLevel;
        gameSpeed += CONFIG.difficulty.speedIncrease;
        trafficSpawnRate += CONFIG.difficulty.spawnIncrease;
        trafficSpawnRate = Math.min(trafficSpawnRate, 0.1); // Cap spawn rate
    }
}

/**
 * Draw the scrolling road with lane markings
 */
function drawRoad() {
    const roadLeft = (CONFIG.canvas.width - CONFIG.road.width) / 2;
    
    // Draw grass on sides
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, roadLeft, CONFIG.canvas.height);
    ctx.fillRect(roadLeft + CONFIG.road.width, 0, roadLeft, CONFIG.canvas.height);
    
    // Draw road surface
    ctx.fillStyle = '#333333';
    ctx.fillRect(roadLeft, 0, CONFIG.road.width, CONFIG.canvas.height);
    
    // Draw animated lane markings
    ctx.fillStyle = '#ffff00';
    const lineWidth = 4;
    const lineLength = 30;
    const lineGap = 30;
    
    // Draw lane divider lines
    for (let lane = 1; lane < CONFIG.road.lanes; lane++) {
        const x = roadLeft + lane * CONFIG.road.laneWidth - lineWidth / 2;
        
        // Create scrolling effect with road offset
        for (let y = -lineLength + (roadOffset % (lineLength + lineGap)); y < CONFIG.canvas.height; y += lineLength + lineGap) {
            if (y + lineLength > 0) {
                ctx.fillRect(x, y, lineWidth, lineLength);
            }
        }
    }
    
    // Update road offset for scrolling animation
    roadOffset += gameSpeed;
}

/**
 * Spawn new traffic cars at random intervals
 */
function spawnTraffic() {
    if (Math.random() < trafficSpawnRate) {
        // Don't spawn if there's already a car too close in the same lane
        const roadLeft = (CONFIG.canvas.width - CONFIG.road.width) / 2;
        const laneIndex = Math.floor(Math.random() * CONFIG.road.lanes);
        const laneX = roadLeft + laneIndex * CONFIG.road.laneWidth;
        
        let canSpawn = true;
        for (let car of trafficCars) {
            if (Math.abs(car.x - laneX) < CONFIG.road.laneWidth / 2 && car.y < 100) {
                canSpawn = false;
                break;
            }
        }
        
        if (canSpawn) {
            trafficCars.push(new TrafficCar());
        }
    }
}

/**
 * Update the heads-up display with current game stats
 */
function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = Math.floor(60 + gameSpeed * 10);
    document.getElementById('level').textContent = level;
}

/**
 * Main game loop - handles all game updates and rendering
 */
function gameLoop() {
    if (gameState !== GameState.PLAYING) return;
    
    // Clear canvas for new frame
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Draw road background
    drawRoad();
    
    // Update game progress
    distance += gameSpeed * 0.1;
    score += Math.floor(gameSpeed * 0.1);
    
    // Adjust difficulty based on progress
    updateDifficulty();
    
    // Spawn new traffic cars
    spawnTraffic();
    
    // Update player car
    player.update();
    
    // Update all traffic cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        car.update();
        
        // Check collision with player
        if (checkCollision(player.getBounds(), car.getBounds())) {
            gameOver();
            return;
        }
        
        // Remove cars that have moved off screen
        if (car.isOffScreen()) {
            trafficCars.splice(i, 1);
        }
    }
    
    // Draw all game objects
    for (let car of trafficCars) {
        car.draw();
    }
    player.draw();
    
    // Update HUD display
    updateHUD();
    
    // Schedule next frame
    animationId = requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', initGame);