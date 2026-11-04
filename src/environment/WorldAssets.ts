import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ColliderData } from './Collisions';
import { Heightfield } from './Terrain';
import { PortalData } from '../systems/Portals';
import hearthModelUrl from '../assets/worlds/hearth/world.glb?url';
import hearthHeightsUrl from '../assets/worlds/hearth/heights.bin?url';
import hearthManifest from '../assets/worlds/hearth/manifest.json';

/** Read from marker Empties in the world's .blend. Positions are game [x, y, z]. */
export interface WorldManifest {
  heightfield: { size: number; resolution: number };
  spawn: { x: number; z: number; facing: number; walkRadius: number };
  firePoint: number[];
  lanternLights: number[][];
  deskLamp: number[];
  dogStart: number[];
  creditsSign: number[];
  colliders: ColliderData[];
  portals: PortalData[];
}

export interface LoadedWorld {
  root: THREE.Group;
  heightfield: Heightfield;
  manifest: WorldManifest;
}

// Worlds built in Blender. See blender/README.md.
const SOURCES: Record<string, { modelUrl: string; heightsUrl: string; manifest: WorldManifest }> = {
  home: { modelUrl: hearthModelUrl, heightsUrl: hearthHeightsUrl, manifest: hearthManifest },
};

// Object names start with their group's name in the .blend.
const CASTS_SHADOW = ['Campsite', 'Props', 'TreesHero', 'Rocks', 'Bushes', 'Deadwood'];
// Foliage gets its depth from vertex colours. Receiving shadows too only adds stripes.
const SKIPS_RECEIVING_SHADOW = ['TreesHero', 'TreesMid', 'TreesFar', 'Bushes'];
const VARIES_PER_INSTANCE = ['TreesHero', 'TreesMid', 'TreesFar', 'Bushes', 'Grass', 'Ferns'];

const inGroup = (name: string, groups: string[]): boolean => groups.some((group) => name.startsWith(group));

interface MaterialPatch {
  // Sideways movement per squared metre of height above the object's base.
  // Runs entirely in the vertex shader: no extra draw calls and no work per object.
  sway?: number;
  // Leaf and blade normals are authored to light as one soft shape. three flips normals
  // on back faces, which would turn half of those surfaces black.
  keepBackFaceNormals?: boolean;
}

const MATERIAL_PATCHES: Record<string, MaterialPatch> = {
  Foliage: { sway: 0.00095 },
  Broadleaf: { sway: 0.0022, keepBackFaceNormals: true },
  Shrub: { sway: 0.035, keepBackFaceNormals: true },
  GroundCover: { keepBackFaceNormals: true },
};

// Shared by every swaying material, so one number moves the whole forest.
const swayTime = { value: 0 };

export function updateWorldAnimation(time: number): void {
  swayTime.value = time;
}

function patchMaterial(material: THREE.Material, patch: MaterialPatch): void {
  const { sway, keepBackFaceNormals } = patch;
  material.customProgramCacheKey = () => `world-${sway !== undefined}-${keepBackFaceNormals === true}`;
  material.onBeforeCompile = (shader) => {
    if (keepBackFaceNormals) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')
      );
    }
    if (sway !== undefined) {
      shader.uniforms.swayTime = swayTime;
      shader.uniforms.swayStrength = { value: sway };
      shader.vertexShader = `uniform float swayTime;\nuniform float swayStrength;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 swayRoot = instanceMatrix[3].xz;
        #else
          vec2 swayRoot = vec2(0.0);
        #endif
        float swayPhase = swayRoot.x * 0.13 + swayRoot.y * 0.17;
        float swayBend = swayStrength * transformed.y * transformed.y;
        transformed.x += swayBend * (sin(swayTime * 0.9 + swayPhase) + 0.4 * sin(swayTime * 2.1 + swayPhase * 1.7));
        transformed.z += swayBend * 0.7 * sin(swayTime * 0.7 + swayPhase * 1.3);`
      );
    }
  };
}

// Seeded so the forest's colour variation is the same on every load.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function varyInstanceColours(mesh: THREE.InstancedMesh, random: () => number): void {
  const colour = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) {
    const value = 0.84 + random() * 0.3;
    colour.setRGB(value * (0.95 + random() * 0.1), value, value * (0.95 + random() * 0.1));
    mesh.setColorAt(i, colour);
  }
}

function prepareMeshes(root: THREE.Group): void {
  const random = seededRandom(20261104);
  // Screens, lit windows, and sign lettering show their colours regardless of lighting.
  const unlit = new THREE.MeshBasicMaterial({ vertexColors: true });
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = inGroup(mesh.name, CASTS_SHADOW);
    mesh.receiveShadow = !inGroup(mesh.name, SKIPS_RECEIVING_SHADOW);

    const material = mesh.material as THREE.Material;
    const patch = MATERIAL_PATCHES[material.name];
    if (patch) patchMaterial(material, patch);
    if (material.name === 'PropGlow') mesh.material = unlit;

    const instanced = mesh as THREE.InstancedMesh;
    if (instanced.isInstancedMesh && inGroup(mesh.name, VARIES_PER_INSTANCE)) {
      varyInstanceColours(instanced, random);
    }
  });
}

async function loadHeights(url: string, manifest: WorldManifest): Promise<Heightfield> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`heights request failed: ${response.status}`);
  const data = new Float32Array(await response.arrayBuffer());
  const { size, resolution } = manifest.heightfield;
  if (data.length !== resolution * resolution) {
    throw new Error(`heights has ${data.length} samples, expected ${resolution * resolution}`);
  }
  return { size, resolution, data };
}

export async function loadWorld(worldId: string): Promise<LoadedWorld> {
  const source = SOURCES[worldId];
  const [gltf, heightfield] = await Promise.all([
    new GLTFLoader().loadAsync(source.modelUrl),
    loadHeights(source.heightsUrl, source.manifest),
  ]);
  prepareMeshes(gltf.scene);
  return { root: gltf.scene, heightfield, manifest: source.manifest };
}
