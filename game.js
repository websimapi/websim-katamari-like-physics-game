class KatamariGame {
  constructor() {
    this.init3D();
    this.initPhysics();
    this.setupWorld();
    this.setupControls();
    this.absorbedObjects = [];
    this.start();
  }

  init3D() {
    // Three.js setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("game-canvas"),
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ff88,
      roughness: 0.8,
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Camera setup
    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);
  }

  initPhysics() {
    // Cannon.js setup
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // Ground physics body
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    this.world.addBody(groundBody);

    // Player ball
    const radius = 1;
    this.playerBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 5, 0),
      material: new CANNON.Material(),
    });
    const sphereShape = new CANNON.Sphere(radius);
    this.playerBody.addShape(sphereShape);
    this.world.addBody(this.playerBody);

    // Player mesh
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    this.playerMesh = new THREE.Mesh(geometry, material);
    this.playerMesh.castShadow = true;
    this.scene.add(this.playerMesh);
  }

  setupWorld() {
    // Generate random objects
    for (let i = 0; i < 50; i++) {
      const size = Math.random() * 2 + 0.5;
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;

      // Physics body
      const shape = new CANNON.Box(
        new CANNON.Vec3(size / 2, size / 2, size / 2)
      );
      const body = new CANNON.Body({
        mass: size,
        shape: shape,
        position: new CANNON.Vec3(x, size + 1, z),
      });
      this.world.addBody(body);

      // Visual mesh
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.userData.body = body;
      body.userData = { mesh };
      this.scene.add(mesh);
    }
  }

  setupControls() {
    let touchStartPos = null;

    // Touch controls
    this.renderer.domElement.addEventListener("touchstart", (e) => {
      touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    });

    this.renderer.domElement.addEventListener("touchend", (e) => {
      if (!touchStartPos) return;

      const touchEndPos = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
      const deltaX = touchEndPos.x - touchStartPos.x;
      const deltaY = touchEndPos.y - touchStartPos.y;

      // Map touch delta to force in XZ plane
      const force = new CANNON.Vec3(
        deltaX * 0.05,
        0,
        -deltaY * 0.05 // Negative because screen Y increases downward
      );

      this.playerBody.applyImpulse(force, this.playerBody.position);
      touchStartPos = null;
    });

    // Collision handling
    this.playerBody.addEventListener("collide", (e) => {
      const otherBody = e.body;

      if (
        !this.absorbedObjects.includes(otherBody) &&
        otherBody.mass <= this.playerBody.mass
      ) {
        // Remove the object from the physics world
        this.world.removeBody(otherBody);

        // Remove the mesh from the scene
        if (otherBody.userData && otherBody.userData.mesh) {
          this.scene.remove(otherBody.userData.mesh);
        }

        // Track absorbed object
        this.absorbedObjects.push(otherBody);

        // Increase player size and mass
        const absorbedMass = otherBody.mass;
        this.playerBody.mass += absorbedMass;

        const oldRadius = this.playerBody.shapes[0].radius;
        const newRadius = oldRadius + absorbedMass * 0.1;

        // Remove old shape and add new shape
        this.playerBody.removeShape(this.playerBody.shapes[0]);
        const newShape = new CANNON.Sphere(newRadius);
        this.playerBody.addShape(newShape);

        // Update mass properties
        this.playerBody.updateMassProperties();

        // Scale player mesh
        const scale = newRadius / oldRadius;
        this.playerMesh.scale.multiplyScalar(scale);

        // Update stats
        this.updateStats();
      }
    });
  }

  updateStats() {
    document.getElementById("size").textContent =
      this.playerBody.shapes[0].radius.toFixed(1);
    document.getElementById("mass").textContent =
      this.playerBody.mass.toFixed(1);
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate);

      // Update physics
      this.world.step(1 / 60);

      // Update visual positions
      this.scene.children.forEach((child) => {
        if (child.userData.body) {
          child.position.copy(child.userData.body.position);
          child.quaternion.copy(child.userData.body.quaternion);
        }
      });

      // Update player mesh position
      this.playerMesh.position.copy(this.playerBody.position);
      this.playerMesh.quaternion.copy(this.playerBody.quaternion);

      // Update camera to follow player
      const cameraOffset = new THREE.Vector3(0, 15, 30);
      this.camera.position.copy(this.playerMesh.position).add(cameraOffset);
      this.camera.lookAt(this.playerMesh.position);

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  const game = window.game;
  if (game) {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Start the game when the page loads
window.addEventListener("load", () => {
  window.game = new KatamariGame();
});