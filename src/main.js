import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TerrainGenerator, createBloomfallTerrain } from './world/TerrainGenerator.js';
import { VegetationManager } from './world/entities/systems/lsystem/lsystem.js'
import { BoidsSystem, CreaturePresets } from './world/entities/boids/boidSystem.js';
import { CreatureSystem } from './world/entities/neuralnetwork/CreatureSystem.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';






/**
 * Configuration de la scène Bloomfall
 */
class BloomfallScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.terrain = null;
    this.terrainGenerator = null;
    
    // Managers
    this.vegetationManager = null;
    this.boidsSystem = null;
    this.creatureSystem = null; // Notre système Algogen
    
    // Time
    this.clock = new THREE.Clock();

    this.init();
    this.animate();

    spawnFlowers(count);
  }

  spawnFlowers(count) {
    const minDistanceFromMountains = 20;
    if (!this.flowerModel) return;
  
    for (let i = 0; i < count; i++) {
      const flower = this.flowerModel.clone(true);
  
      // Position aléatoire sur le terrain
      const position = this.vegetationManager.getRandomPlainsPosition(minDistanceFromMountains);
      flower.position.copy(position);
  
      // Rotation aléatoire
      flower.rotation.y = Math.random() * Math.PI * 2;
  
      // Légère variation de taille
      const scale = 0.08 + Math.random() * 0.04;
      flower.scale.set(scale, scale, scale);
  
      this.scene.add(flower);
    }
  }
  
  

  init() {
    // 1. Initialisation Scène de base
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 250);

    // 2. Caméra
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(80, 60, 80);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // 4. Contrôles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 300;

    // 5. Lumières
    this.setupLights();

    // 6. Terrain
    const terrainConfig = {
      size: 400,
      resolution: 128,
      heightScale: 100,
      seed: Math.random(),
      mountainOctaves: 7,
      mountainPersistence: 0.5,
      mountainLacunarity: 2.3,
      mountainExponent: 2.2,
      mountainBaseHeight: 0.5,
      plainsOctaves: 4,
      plainsPersistence: 0.6,
      plainsLacunarity: 2.0,
      plainsHeightScale: 0.25,
      transitionWidth: 40,
    };

    const result = createBloomfallTerrain(this.scene, terrainConfig);
    this.terrain = result.terrain;
    this.terrainGenerator = result.generator;

    // 7. Écosystème
    this.setupVegetation(); // Arbres et fleurs
    this.setupBoids();      // Lucioles (boids)
    this.setupCreatures();  // <--- NOUVEAU: Les créatures neuronales

    // 8. UI & Events
    window.addEventListener('resize', () => this.onWindowResize());
    this.displayTerrainInfo();
    this.createControlsUI(); // Bouton pour l'évolution

    // const gltfLoader = new GLTFLoader();
    // gltfLoader.load('/flowers/scene.gltf', (gltfScene) => {
    //   gltfScene.scene.scale.set(0.1, 0.1, 0.1);
    //   gltfScene.scene.position.set(0, 0, 0.5);
    //   this.scene.add(gltfScene.scene);

    //   console.log('Modèle chargé:', gltfScene.scene);
    //   console.log('Position:', gltfScene.scene.position);
    //   console.log('Scale:', gltfScene.scene.scale);
    // });

    const gltfLoader = new GLTFLoader();
    this.flowerModel = null;
    gltfLoader.load('/flowers/scene.gltf', (gltf) => {
      this.flowerModel = gltf.scene;
      this.flowerModel.scale.set(0.1, 0.1, 0.1);
      console.log('Modèle de fleur chargé');
      this.spawnFlowers(200);// Exemple : générer 50 fleurs
    });

    

  }

  setupVegetation() {
    console.log('🌱 Génération de la végétation...');
    this.vegetationManager = new VegetationManager(this.scene, this.terrainGenerator);
    this.vegetationManager.populate({
      numTrees: 80,
      numBushes: 120,
      numGrass: 250,
      numFlowers: 150,
      minDistanceFromMountains: 10,
    });
  }

  setupBoids() {
    console.log('🐝 Création des boids...');
    this.boidsSystem = new BoidsSystem(
      this.scene,
      this.terrainGenerator,
      50,
      CreaturePresets.default
    );
  }

  // --- INTÉGRATION ALGOGEN ---
  setupCreatures() {
    console.log('🧬 Initialisation de la Vie Artificielle...');
    
    // On passe la scène et le générateur de terrain pour qu'elles marchent au sol
    this.creatureSystem = new CreatureSystem(this.scene, this.terrainGenerator, {
        populationSize: 30, // Tu peux ajuster le nombre ici
        worldSize: 200      // Doit correspondre à la taille du terrain
    });

    console.log('✅ Créatures actives !');
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    
    // Ombres optimisées
    const d = 100;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.2);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  displayTerrainInfo() {
    const infoDiv = document.createElement('div');
    Object.assign(infoDiv.style, {
        position: 'absolute', top: '10px', left: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white',
        padding: '15px', fontFamily: 'monospace', fontSize: '14px',
        borderRadius: '5px', zIndex: '1000'
    });
    // infoDiv.innerHTML = `...`; // Tu peux remettre tes infos ici si tu veux
    document.body.appendChild(infoDiv);
  }

  // Interface simple pour contrôler l'évolution
  createControlsUI() {
    const btn = document.createElement('button');
    btn.textContent = "Next Generation >>";
    Object.assign(btn.style, {
        position: 'absolute', top: '10px', right: '10px',
        padding: '10px 20px', fontSize: '16px', cursor: 'pointer',
        backgroundColor: '#4CAF50', color: 'white', border: 'none',
        borderRadius: '5px', zIndex: '1000'
    });
    
    btn.onclick = () => {
        if(this.creatureSystem) this.creatureSystem.nextGeneration();
    };
    document.body.appendChild(btn);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Calcul du Delta Time pour des mouvements fluides
    const delta = this.clock.getDelta();

    this.controls.update();

    // Update Boids
    if (this.boidsSystem) {
      this.boidsSystem.update(delta);
    }

    // Update Créatures Algogen
    if (this.creatureSystem) {
        this.creatureSystem.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialisation au chargement
window.addEventListener('DOMContentLoaded', () => {
  new BloomfallScene();
});

export default BloomfallScene;