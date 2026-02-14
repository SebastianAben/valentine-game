const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('win-screen');
const startBtn = document.getElementById('start-btn');
const replayBtn = document.getElementById('replay-btn');

// Game State
let gameRunning = false;
let score = 0;
let animationId;
const TARGET_SCORE = 14;

// Resize Canvas
function resize() {
    canvas.width = document.getElementById('game-container').offsetWidth;
    canvas.height = document.getElementById('game-container').offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game Objects ---

// Player (The Kitten Basket)
const playerImg = new Image();
playerImg.src = '/kitten.png'; // Path relative to public folder

const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 80,
    height: 80,
    draw() {
        // Only draw if image is fully loaded and not broken
        if (playerImg.complete && playerImg.naturalWidth !== 0) {
            ctx.drawImage(playerImg, this.x - this.width / 2, this.y, this.width, this.height);
        } else {
            // Fallback while loading or if error
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🧺', this.x, this.y + 40);
        }
    },
    update(inputX) {
        // Always snap to bottom relative to current canvas height
        this.y = canvas.height - 90;

        // Smooth movement towards input
        if (inputX !== null) {
            this.x += (inputX - this.x) * 0.2;
        }
        // Boundaries
        if (this.x < 40) this.x = 40;
        if (this.x > canvas.width - 40) this.x = canvas.width - 40;
    }
};

// Falling Hearts
let hearts = [];
const heartEmojis = ['❤️', '💖', '💘', '💝', '💓'];
const badEmojis = ['💔']; // Optional: obstacles

class Heart {
    constructor() {
        this.x = Math.random() * (canvas.width - 60) + 30;
        this.y = -50;
        this.speed = Math.random() * 3 + 2; // Speed 2-5
        this.type = Math.random() > 0.1 ? 'good' : 'bad'; // 10% chance of bad (if enabled)
        this.emoji = this.type === 'good' 
            ? heartEmojis[Math.floor(Math.random() * heartEmojis.length)]
            : badEmojis[0];
        this.size = 30 + Math.random() * 20;
    }

    draw() {
        ctx.font = `${this.size}px Arial`;
        ctx.fillText(this.emoji, this.x, this.y);
    }

    update() {
        this.y += this.speed;
    }
}

// --- Input Handling ---
let inputX = canvas.width / 2;

// Mouse / Touch
function handleInput(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX;
    
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    
    inputX = clientX - rect.left;
}

window.addEventListener('mousemove', handleInput);
window.addEventListener('touchmove', handleInput, { passive: false });
window.addEventListener('touchstart', handleInput, { passive: false });


// --- Optimization: Emoji Cache ---
// Pre-render emojis to off-screen canvases to improve mobile performance significantly
const emojiCache = {};

function getCachedEmoji(emoji, size) {
    const key = `${emoji}-${size}`;
    if (emojiCache[key]) return emojiCache[key];

    const c = document.createElement('canvas');
    c.width = size + 10; // Padding
    c.height = size + 10;
    const t = c.getContext('2d');
    t.font = `${size}px Arial`;
    t.textAlign = 'center';
    t.textBaseline = 'middle';
    t.fillText(emoji, c.width / 2, c.height / 2);
    
    emojiCache[key] = c;
    return c;
}

// Pre-load common emojis
const particleChars = ['❤️', '💔', '🎉', '🎊', '✨', '💖'];

heartEmojis.forEach(e => getCachedEmoji(e, 40)); // Default size approx
badEmojis.forEach(e => getCachedEmoji(e, 40));
particleChars.forEach(e => getCachedEmoji(e, 20));

// --- Game Loop ---

function spawnHeart() {
    if (Math.random() < 0.03) { // 3% chance per frame
        hearts.push(new Heart());
    }
}

function checkCollisions() {
    // Iterate backwards to safely remove items
    for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        
        // Simple distance check
        const dist = Math.hypot(player.x - heart.x, player.y - heart.y + 20); // +20 adjusts for emoji center
        
        if (dist < 45) { // Collision Radius
            // Hit!
            if (heart.type === 'good') {
                score++;
                createParticles(heart.x, heart.y, '❤️');
            } else {
                score = Math.max(0, score - 1);
                createParticles(heart.x, heart.y, '💔');
            }
            
            hearts.splice(i, 1);
            scoreEl.innerText = score;
            
            // Win Condition
            if (score >= TARGET_SCORE) {
                winGame();
            }
        } else if (heart.y > canvas.height) {
            // Remove if off screen
            hearts.splice(i, 1);
        }
    }
}

function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update(inputX);
    player.draw();

    spawnHeart();

    hearts.forEach(heart => {
        heart.update();
        heart.draw();
    });

    updateParticles();
    checkCollisions();

    animationId = requestAnimationFrame(update);
}

class Heart {
    constructor() {
        this.x = Math.random() * (canvas.width - 60) + 30;
        this.y = -50;
        this.speed = Math.random() * 3 + 2; // Speed 2-5
        this.type = Math.random() > 0.1 ? 'good' : 'bad'; // 10% chance of bad (if enabled)
        this.emoji = this.type === 'good' 
            ? heartEmojis[Math.floor(Math.random() * heartEmojis.length)]
            : badEmojis[0];
        this.size = 30 + Math.floor(Math.random() * 20); // Integer size for better caching
        
        // Cache immediately
        this.cachedImg = getCachedEmoji(this.emoji, this.size);
    }

    draw() {
        // Draw image instead of text for performance
        if (this.cachedImg) {
            ctx.drawImage(this.cachedImg, this.x - this.cachedImg.width/2, this.y - this.cachedImg.height/2);
        }
    }

    update() {
        this.y += this.speed;
    }
}

// --- Particles (Explosion Effect) ---
let particles = [];
function createParticles(x, y, char) {
    const cached = getCachedEmoji(char, 20);
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            cachedImg: cached
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.vy += 0.5; // Gravity
        
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.cachedImg) {
            ctx.drawImage(p.cachedImg, p.x - p.cachedImg.width/2, p.y - p.cachedImg.height/2);
        }
        ctx.globalAlpha = 1.0;

        if (p.life <= 0) particles.splice(i, 1);
    }
}

// --- Confetti (Simple Implementation) ---
function triggerConfetti() {
    // A simple burst of colors using our existing particle system logic
    // but covering the whole screen
    for (let i = 0; i < 100; i++) {
        const char = ['🎉', '🎊', '✨', '💖'][Math.floor(Math.random()*4)];
        const cached = getCachedEmoji(char, 30);
        
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 1) * 30,
            life: 3.0,
            cachedImg: cached
        });
    }
    
    // Run a mini loop just for confetti if game is stopped
    function drawConfetti() {
        if (gameRunning) return; // Stop if game restarted
        if (particles.length === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Redraw last state of game for background
        player.draw(); 
        
        updateParticles();
        requestAnimationFrame(drawConfetti);
    }
    drawConfetti();
}

startBtn.addEventListener('click', startGame);
replayBtn.addEventListener('click', startGame);