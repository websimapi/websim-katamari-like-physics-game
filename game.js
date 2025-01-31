const { Engine, Render, World, Bodies, Body, Events, Composite } = Matter;

class KatamariGame {
  constructor() {
    // Create engine and world
    this.engine = Engine.create({
      gravity: { x: 0, y: 0 }
    });
    this.world = this.engine.world;

    // Setup canvas
    this.canvas = document.getElementById('game-canvas');
    this.render = Render.create({
      canvas: this.canvas,
      engine: this.engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#87CEEB'
      }
    });

    // Create player ball
    this.player = Bodies.circle(window.innerWidth / 2, window.innerHeight / 2, 20, {
      render: { fillStyle: '#4CAF50' },
      friction: 0.1,
      mass: 1,
      density: 0.001
    });
    World.add(this.world, this.player);

    // Track absorbed objects
    this.absorbedObjects = [];
    
    this.setupWorld();
    this.setupControls();
    this.setupCollisions();
    this.start();
  }

  setupWorld() {
    // Generate random objects
    for (let i = 0; i < 50; i++) {
      const size = Math.random() * 30 + 10;
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      
      const object = Bodies.rectangle(x, y, size, size, {
        render: {
          fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`
        },
        mass: size * 0.1,
        isStatic: false
      });
      
      World.add(this.world, object);
    }
  }

  setupControls() {
    let touchStartPos = null;
    
    // Touch controls
    this.canvas.addEventListener('touchstart', (e) => {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    this.canvas.addEventListener('touchend', (e) => {
      if (!touchStartPos) return;
      
      const touchEndPos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const force = {
        x: (touchEndPos.x - touchStartPos.x) * 0.001,
        y: (touchEndPos.y - touchStartPos.y) * 0.001
      };
      
      Body.applyForce(this.player, this.player.position, force);
      touchStartPos = null;
    });

    // Mouse controls
    let isMouseDown = false;
    let mouseStartPos = null;

    this.canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      mouseStartPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!isMouseDown || !mouseStartPos) return;
      
      const force = {
        x: (e.clientX - mouseStartPos.x) * 0.001,
        y: (e.clientY - mouseStartPos.y) * 0.001
      };
      
      Body.applyForce(this.player, this.player.position, force);
      isMouseDown = false;
      mouseStartPos = null;
    });
  }

  setupCollisions() {
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const playerBody = bodyA === this.player ? bodyA : bodyB;
        const otherBody = bodyA === this.player ? bodyB : bodyA;

        if (playerBody === this.player && !this.absorbedObjects.includes(otherBody)) {
          if (otherBody.mass <= this.player.mass) {
            // Absorb the object
            World.remove(this.world, otherBody);
            this.absorbedObjects.push(otherBody);
            
            // Increase player size and mass
            const scale = 1 + (otherBody.mass * 0.1);
            Body.scale(this.player, scale, scale);
            this.player.mass += otherBody.mass;
            
            // Update stats display
            this.updateStats();
          }
        }
      });
    });
  }

  updateStats() {
    document.getElementById('size').textContent = (this.player.circleRadius / 20).toFixed(1);
    document.getElementById('mass').textContent = this.player.mass.toFixed(1);
  }

  start() {
    Engine.run(this.engine);
    Render.run(this.render);

    // Game loop
    const gameLoop = () => {
      requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }
}

// Start the game when the page loads
window.addEventListener('load', () => {
  new KatamariGame();
});