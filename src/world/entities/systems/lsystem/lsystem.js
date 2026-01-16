import * as THREE from 'three';
import { PI } from 'three/tsl';

/**
 * Classe pour générer des plantes et arbres avec les L-Systems
 */
export class LSystem {
  constructor(config = {}) {
    this.axiom = config.axiom || 'F';
    this.rules = config.rules || {};
    this.angle = config.angle || 25;
    this.iterations = config.iterations || 4;
    this.length = config.length || 1;
    this.lengthDecay = config.lengthDecay || 0.8;
    this.thickness = config.thickness || 0.15;
    this.thicknessDecay = config.thicknessDecay || 0.7;
    this.color = config.color || 0x4A7C2F;
    this.leafColor = config.leafColor || 0x2E5C1F;
  }

  /**
   * Génère la chaîne L-System en appliquant les règles
   */
  generate() {
    let current = this.axiom;
    
    for (let i = 0; i < this.iterations; i++) {
      let next = '';
      for (let char of current) {
        next += this.rules[char] || char;
      }
      current = next;
    }
    
    return current;
  }

  /**
   * Interprète la chaîne L-System et crée la géométrie 3D
   */
  createGeometry(instructions) {
    const vertices = [];
    const indices = [];
    const colors = [];
    
    // État de la tortue
    const state = {
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 1, 0),
      right: new THREE.Vector3(1, 0, 0),
      length: this.length,
      thickness: this.thickness,
    };
    
    const stack = [];
    let vertexIndex = 0;

    // Convertir les angles en radians
    const angleRad = (this.angle * Math.PI) / 180;

    for (let char of instructions) {
      switch (char) {
        case 'F': // Avancer et dessiner
          this.drawBranch(state, vertices, indices, colors, vertexIndex);
          vertexIndex += 8; // Chaque branche = 8 vertices (cylindre simplifié)
          
          // Avancer
          state.position.add(
            state.direction.clone().multiplyScalar(state.length)
          );
          break;

        case 'f': // Avancer sans dessiner
          state.position.add(
            state.direction.clone().multiplyScalar(state.length)
          );
          break;

        case '+': // Tourner à droite
          this.rotateAround(state.direction, state.right, angleRad);
          break;

        case '-': // Tourner à gauche
          this.rotateAround(state.direction, state.right, -angleRad);
          break;

        case '&': // Piquer vers le bas
          {
            const up = new THREE.Vector3(0, 1, 0);
            const axis = new THREE.Vector3().crossVectors(state.direction, up).normalize();
            this.rotateAround(state.direction, axis, angleRad);
          }
          break;

        case '^': // Cabrer vers le haut
          {
            const up = new THREE.Vector3(0, 1, 0);
            const axis = new THREE.Vector3().crossVectors(state.direction, up).normalize();
            this.rotateAround(state.direction, axis, -angleRad);
          }
          break;

        case '\\': // Rouler à droite
          this.rotateAround(state.right, state.direction, angleRad);
          break;

        case '/': // Rouler à gauche
          this.rotateAround(state.right, state.direction, -angleRad);
          break;

        case '|': // Demi-tour
          state.direction.negate();
          break;

        case '[': // Sauvegarder l'état
          stack.push({
            position: state.position.clone(),
            direction: state.direction.clone(),
            right: state.right.clone(),
            length: state.length,
            thickness: state.thickness,
          });
          state.length *= this.lengthDecay;
          state.thickness *= this.thicknessDecay;
          break;

        case ']': // Restaurer l'état
          if (stack.length > 0) {
            const saved = stack.pop();
            state.position = saved.position;
            state.direction = saved.direction;
            state.right = saved.right;
            state.length = saved.length;
            state.thickness = saved.thickness;
          }
          break;

        case 'L': // Feuille
          this.drawLeaf(state, vertices, indices, colors, vertexIndex);
          vertexIndex += 3; // Triangle pour la feuille
          break;
      }
    }

    // Créer la géométrie
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Dessine une branche (cylindre simplifié)
   */
  drawBranch(state, vertices, indices, colors, startIndex) {
    const start = state.position.clone();
    const end = start.clone().add(state.direction.clone().multiplyScalar(state.length));
    const thickness = state.thickness;

    // Créer un cylindre simple (4 côtés pour performance)
    const sides = 4;
    const up = state.direction.clone().normalize();
    const right = state.right.clone().normalize();

    // Couleur de la branche (marron/vert selon épaisseur)
    const branchColor = new THREE.Color(this.color);
    const r = branchColor.r;
    const g = branchColor.g;
    const b = branchColor.b;

    for (let i = 0; i < sides; i++) {
      const angle1 = (i / sides) * Math.PI * 2;
      const angle2 = ((i + 1) / sides) * Math.PI * 2;

      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2);
      const sin2 = Math.sin(angle2);

      // Points du bas
      const p1 = start.clone().add(
        right.clone().multiplyScalar(cos1 * thickness)
      ).add(
        new THREE.Vector3(-up.z * sin1, 0, up.x * sin1).multiplyScalar(thickness)
      );

      const p2 = start.clone().add(
        right.clone().multiplyScalar(cos2 * thickness)
      ).add(
        new THREE.Vector3(-up.z * sin2, 0, up.x * sin2).multiplyScalar(thickness)
      );

      // Points du haut (plus fins)
      const p3 = end.clone().add(
        right.clone().multiplyScalar(cos1 * thickness * 0.7)
      ).add(
        new THREE.Vector3(-up.z * sin1, 0, up.x * sin1).multiplyScalar(thickness * 0.7)
      );

      const p4 = end.clone().add(
        right.clone().multiplyScalar(cos2 * thickness * 0.7)
      ).add(
        new THREE.Vector3(-up.z * sin2, 0, up.x * sin2).multiplyScalar(thickness * 0.7)
      );

      // Ajouter les vertices
      vertices.push(p1.x, p1.y, p1.z);
      vertices.push(p2.x, p2.y, p2.z);
      vertices.push(p3.x, p3.y, p3.z);
      vertices.push(p4.x, p4.y, p4.z);

      // Couleurs
      for (let j = 0; j < 4; j++) {
        colors.push(r, g, b);
      }

      // Indices pour les triangles
      const base = startIndex + i * 4;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  /**
   * Dessine une feuille (triangle simple)
   */
  drawLeaf(state, vertices, indices, colors, startIndex) {
    const pos = state.position.clone();
    const size = this.length * 0.5;

    // Triangle pour la feuille
    const p1 = pos.clone();
    const p2 = pos.clone().add(state.right.clone().multiplyScalar(size * 0.3));
    const p3 = pos.clone().add(state.direction.clone().multiplyScalar(size));

    vertices.push(p1.x, p1.y, p1.z);
    vertices.push(p2.x, p2.y, p2.z);
    vertices.push(p3.x, p3.y, p3.z);

    // Couleur des feuilles
    const leafColor = new THREE.Color(this.leafColor);
    for (let i = 0; i < 3; i++) {
      colors.push(leafColor.r, leafColor.g, leafColor.b);
    }

    indices.push(startIndex, startIndex + 1, startIndex + 2);
  }

  /**
   * Rotation autour d'un axe
   */
  rotateAround(vector, axis, angle) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis, angle);
    vector.applyQuaternion(quaternion);
    vector.normalize();
  }

  /**
   * Crée un mesh complet
   */
  createMesh() {
    const instructions = this.generate();
    const geometry = this.createGeometry(instructions);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }
}

/**
 * Presets de végétation
 */
export const VegetationPresets = {
  // Petit buisson simple
  smallBush: {
    axiom: 'F',
    rules: { 'F': 'F[+F][-F]F' },
    iterations: 3,
    angle: 25,
    length: 0.8,
    lengthDecay: 0.75,
    thickness: 0.08,
    thicknessDecay: 0.7,
    color: 0x4A7C2F,
  },

  // Arbre simple avec branches
  simpleTree: {
    axiom: 'F',
    rules: { 'F': 'FF[+F][-F][&F][^F]' },
    iterations: 4,
    angle: 30,
    length: 1.2,
    lengthDecay: 0.7,
    thickness: 0.15,
    thicknessDecay: 0.65,
    color: 0x3D2817,
    leafColor: 0x2E5C1F,
  },

  // Arbre touffu
  bushyTree: {
    axiom: 'F',
    rules: { 'F': 'F[+F][-F][&F][^F]F' },
    iterations: 4,
    angle: 25,
    length: 1.0,
    lengthDecay: 0.75,
    thickness: 0.18,
    thicknessDecay: 0.7,
    color: 0x3D2817,
    leafColor: 0x4A7C2F,
  },

  // Grand arbre majestueux
  largeTree: {
    axiom: 'FFF',
    rules: { 
      'F': 'F[+F][-F][&F]',
    },
    iterations: 5,
    angle: 28,
    length: 1.5,
    lengthDecay: 0.68,
    thickness: 0.25,
    thicknessDecay: 0.65,
    color: 0x3D2817,
    leafColor: 0x2E5C1F,
  },

  // Herbe haute
  tallGrass: {
    axiom: 'F',
    rules: { 'F': 'F[+F][-F]' },
    iterations: 2,
    angle: 35,
    length: 0.4,
    lengthDecay: 0.8,
    thickness: 0.03,
    thicknessDecay: 0.8,
    color: 0x7EC850,
  },

  // Fleur
  flower: {
    axiom: 'F',
    rules: { 'F': 'F[+L][-L][&L][^L]L' },
    iterations: 2,
    angle: 45,
    length: 0.6,
    lengthDecay: 0.7,
    thickness: 0.04,
    thicknessDecay: 0.6,
    color: 0x4A7C2F,
    leafColor: 0xFF69B4,
  },

  // Conifère (pin)
  conifer: {
    axiom: 'F',
    rules: { 'F': 'F[+F][F][-F]F' },
    iterations: 5,
    angle: 20,
    length: 1.0,
    lengthDecay: 0.8,
    thickness: 0.12,
    thicknessDecay: 0.75,
    color: 0x2E5C1F,
    leafColor: 0x1A3D0F,
  },

  // Arbre d'automne
  autumnTree: {
    axiom: 'F',
    rules: { 'F': 'FF[+F][-F][&F][^F]L' },
    iterations: 4,
    angle: 30,
    length: 1.1,
    lengthDecay: 0.72,
    thickness: 0.16,
    thicknessDecay: 0.68,
    color: 0x3D2817,
    leafColor: 0xD2691E,
  },
};

/**
 * Gestionnaire de végétation pour le terrain
 */
export class VegetationManager {
  constructor(scene, terrainGenerator) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    this.vegetation = [];
  }

  /**
   * Place de la végétation aléatoire dans les plaines uniquement
   */
  populate(config = {}) {
    const {
      numTrees = 300,
      numBushes = 150,
      numGrass = 300,
      numFlowers = 200,
      minDistanceFromMountains = 10, // Distance minimale des montagnes
    } = config;

    // Effacer la végétation existante
    this.clear();

    // Arbres
    // for (let i = 0; i < numTrees; i++) {
    //   const position = this.getForestCenter(minDistanceFromMountains);
    //   if (position) {
    //     const tree = this.createRandomTree();
    //     tree.position.copy(position);
        
    //     // Rotation aléatoire
    //     tree.rotation.y = Math.random() * Math.PI * 2;
        
    //     // Variation de taille
    //     const scale = 0.8 + Math.random() * 0.4;
    //     tree.scale.set(scale, scale, scale);
        
    //     this.scene.add(tree);
    //     this.vegetation.push(tree);
    //   }
    // }
    // ===== FORÊTS =====
    const numForests = Math.floor(numTrees / 20); // ex: 5 forêts
    const treesPerForest = 500;
    const forestRadius = 100; // PLUS PETIT = PLUS DENSE 🌲🌲🌲

    for (let i = 0; i < numForests; i++) {
      const treePositions = this.generateForest(treesPerForest, forestRadius);

      for (const position of treePositions) {
        const tree = this.createRandomTree();
        tree.position.copy(position);

        tree.rotation.y = Math.random() * Math.PI * 2;

        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);

        this.scene.add(tree);
        this.vegetation.push(tree);
      }
    }

    // Buissons
    for (let i = 0; i < numBushes; i++) {
      const treeCount = 30;
      const radius = 5;
      const position = this.generateForest(treeCount, radius);
      if (position) {
        const bush = this.createBush();
        bush.position.copy(position);
        bush.rotation.y = Math.random() * Math.PI * 2;
        
        const scale = 0.7 + Math.random() * 0.6;
        bush.scale.set(scale, scale, scale);
        
        this.scene.add(bush);
        this.vegetation.push(bush);
      }
    }

    // Herbe
    for (let i = 0; i < numGrass; i++) {
      const position = this.getRandomPlainsPosition(minDistanceFromMountains);
      if (position) {
        const grass = this.createGrass();
        grass.position.copy(position);
        grass.rotation.y = Math.random() * Math.PI * 2;
        
        const scale = 0.8 + Math.random() * 0.4;
        grass.scale.set(scale, scale, scale);
        
        this.scene.add(grass);
        this.vegetation.push(grass);
      }
    }

    // Fleurs
    for (let i = 0; i < numFlowers; i++) {
      const position = this.getRandomPlainsPosition(minDistanceFromMountains);
      if (position) {
        const flower = this.createFlower();
        flower.position.copy(position);
        flower.rotation.y = Math.random() * Math.PI * 2;
        
        const scale = 0.6 + Math.random() * 0.4;
        flower.scale.set(scale, scale, scale);
        
        this.scene.add(flower);
        this.vegetation.push(flower);
      }
    }

    console.log(`✅ ${this.vegetation.length} plantes générées dans les plaines`);
  }

  /**
   * Obtient une position aléatoire dans les plaines (pas les montagnes)
   */
  getRandomPlainsPosition(minDistanceFromMountains = 10) {
    const { size } = this.terrainGenerator.config;
    const maxAttempts = 50;

    for (let i = 0; i < maxAttempts; i++) {
      const x = (Math.random() - 0.5) * size * 0.9;
      const z = (Math.random() - 0.5) * size * 0.9;
      
      const biome = this.terrainGenerator.getBiomeAt(x, z);
      
      // Seulement dans les plaines, pas dans les montagnes ou transition
      if (biome === 'plains') {
        // Vérifier la distance des montagnes
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        const centerRadius = size * 0.3; // Rayon approximatif de la zone montagneuse
        
        if (distanceFromCenter > centerRadius + minDistanceFromMountains) {
          const y = this.terrainGenerator.getHeightAt(x, z);
          return new THREE.Vector3(x, y, z);
        }
      }
    }

    return null; // Impossible de trouver une position valide
  }


  generateForest(treeCount, radius) {
    const minDistanceFromMountains = 10;
    const center = this.getRandomPlainsPosition(minDistanceFromMountains);
    if (!center) return [];
  
    const trees = [];
  
    for (let i = 0; i < treeCount; i++) {
      // Offset très faible → arbres proches
      const offsetX = (Math.random() - 0.5) * radius;
      const offsetZ = (Math.random() - 0.5) * radius;
      const angle = (Math.random()*Math.PI);
  
      const x = center.x + offsetX*Math.cos(angle);
      const z = center.z + offsetZ*Math.sin(angle);
  
      // Sécurité : rester en plaines
      if (this.terrainGenerator.getBiomeAt(x, z) !== 'plains') continue;
  
      const y = this.terrainGenerator.getHeightAt(x, z);
      trees.push(new THREE.Vector3(x, y, z));
    }
  
    return trees;
  }

  /**
   * Crée un arbre aléatoire
   */
  createRandomTree() {
    const presets = ['simpleTree', 'bushyTree', 'largeTree', 'conifer'];
    const preset = presets[Math.floor(Math.random() * presets.length)];
    const config = VegetationPresets[preset];
    
    const lsystem = new LSystem(config);
    return lsystem.createMesh();
  }

  /**
   * Crée un buisson
   */
  createBush() {
    const config = VegetationPresets.smallBush;
    const lsystem = new LSystem(config);
    return lsystem.createMesh();
  }

  /**
   * Crée de l'herbe
   */
  createGrass() {
    const config = VegetationPresets.tallGrass;
    const lsystem = new LSystem(config);
    return lsystem.createMesh();
  }

  /**
   * Crée une fleur
   */
  createFlower() {
    const config = VegetationPresets.flower;
    const lsystem = new LSystem(config);
    return lsystem.createMesh();
  }

  /**
   * Efface toute la végétation
   */
  clear() {
    for (let plant of this.vegetation) {
      this.scene.remove(plant);
      plant.geometry.dispose();
      plant.material.dispose();
    }
    this.vegetation = [];
  }
}

export default LSystem;