import fs from 'fs';
import path from 'path';

/**
 * Binary GLTF/GLB Inspector for KINETIC Blood Orange Energy Drink 3D Asset.
 * Verifies Node 13 can assembly, 12 submeshes, 65,706 triangles, 8 materials,
 * Node 14 studio floor suppression target, and [0, -7.85, 0] pivot offset.
 */

export const GLB_MAGIC = 0x46546c67; // 'glTF' in little-endian
export const GLB_VERSION = 2;
export const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON' in little-endian
export const BIN_CHUNK_TYPE = 0x004e4942;  // 'BIN\0' in little-endian

export const REQUIRED_SUBMESHES = [
  'Bottom • concave pressure dome',
  'Can body • seamless drawn shell',
  'Condensation • 32 subtle beads | single mesh',
  'Lid • formed panel & integrated countersink',
  'Lid • smoothly pressed stiffening channel',
  'Lower standing ring • rolled heel',
  'Pull tab • domed retaining rivet',
  'Pull tab • formed finger-hole edge',
  'Pull tab • formed sheet & open apertures',
  'Tear panel • continuous scored outline',
  'Tear panel • raised stamped edge',
  'Top • double rolled seam',
];

export const AUTHORED_MATERIALS = [
  'Raw Aluminum • Can Top & Lid',
  'Body • Drawn Aluminum with Direct Print',
  'Tab • Stamped Aluminum',
  'Condensation Drops',
  'Seam • Double Rolled Edge',
  'Lid Countersink',
  'Scored Opening',
  'Studio floor • warm ivory'
];

export class ModelValidator {
  constructor(filePath) {
    this.filePath = filePath;
    this.buffer = null;
    this.header = null;
    this.jsonChunk = null;
    this.binChunk = null;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`GLB file does not exist at path: ${this.filePath}`);
    }
    this.buffer = fs.readFileSync(this.filePath);
    this._parse();
    return this;
  }

  _parse() {
    if (this.buffer.length < 12) {
      throw new Error(`Invalid GLB: file length ${this.buffer.length} < 12 bytes header`);
    }

    const magic = this.buffer.readUInt32LE(0);
    const version = this.buffer.readUInt32LE(4);
    const totalLength = this.buffer.readUInt32LE(8);

    this.header = { magic, version, totalLength };

    if (magic !== GLB_MAGIC) {
      throw new Error(`Invalid GLB magic header: 0x${magic.toString(16)}, expected 0x${GLB_MAGIC.toString(16)} ('glTF')`);
    }

    if (version !== GLB_VERSION) {
      throw new Error(`Unsupported GLB version: ${version}, expected ${GLB_VERSION}`);
    }

    if (totalLength !== this.buffer.length) {
      throw new Error(`GLB length header mismatch: ${totalLength} != actual buffer length ${this.buffer.length}`);
    }

    let offset = 12;
    while (offset < this.buffer.length) {
      const chunkLength = this.buffer.readUInt32LE(offset);
      const chunkType = this.buffer.readUInt32LE(offset + 4);
      const chunkData = this.buffer.subarray(offset + 8, offset + 8 + chunkLength);

      if (chunkType === JSON_CHUNK_TYPE) {
        this.jsonChunk = JSON.parse(chunkData.toString('utf8'));
      } else if (chunkType === BIN_CHUNK_TYPE) {
        this.binChunk = chunkData;
      }

      offset += 8 + chunkLength;
    }

    if (!this.jsonChunk) {
      throw new Error('GLB missing required JSON chunk');
    }
  }

  getMeshes() {
    return this.jsonChunk.meshes || [];
  }

  getNodes() {
    return this.jsonChunk.nodes || [];
  }

  getMaterials() {
    return this.jsonChunk.materials || [];
  }

  getTextures() {
    return this.jsonChunk.textures || [];
  }

  findMeshByName(keyword) {
    const meshes = this.getMeshes();
    return meshes.find(m => m.name && m.name.toLowerCase().includes(keyword.toLowerCase()));
  }

  findNodeByName(keyword) {
    const nodes = this.getNodes();
    return nodes.find(n => n.name && n.name.toLowerCase().includes(keyword.toLowerCase()));
  }

  hasCanAssembly() {
    const assemblyNode = this.findNodeByName('complete can assembly');
    return Boolean(assemblyNode);
  }

  hasCondensationBeads() {
    const condensationMesh = this.findMeshByName('Condensation');
    return Boolean(condensationMesh);
  }

  hasStudioFloor() {
    const floorNode = this.findNodeByName('Studio floor') || this.findNodeByName('Plane.001');
    return Boolean(floorNode);
  }

  getRequiredCanSubmeshes() {
    const meshes = this.getMeshes();
    const present = [];
    const missing = [];

    for (const required of REQUIRED_SUBMESHES) {
      const match = meshes.find(m => m.name && m.name.toLowerCase().includes(required.toLowerCase().slice(0, 15)));
      if (match) {
        present.push({ name: required, meshIndex: meshes.indexOf(match), actualName: match.name });
      } else {
        missing.push(required);
      }
    }

    return {
      isComplete: missing.length === 0,
      present,
      missing,
    };
  }

  getAuthoredMaterials() {
    const materials = this.getMaterials();
    const present = [];
    const missing = [];

    for (const matName of AUTHORED_MATERIALS) {
      const match = materials.find(m => m.name && m.name.toLowerCase().includes(matName.toLowerCase().slice(0, 15)));
      if (match) {
        present.push({ name: matName, material: match });
      } else {
        missing.push(matName);
      }
    }

    return {
      isComplete: missing.length === 0,
      present,
      missing,
    };
  }

  getTriangleCount() {
    const meshes = this.getMeshes();
    const accessors = this.jsonChunk.accessors || [];
    let totalTriangles = 0;

    for (const mesh of meshes) {
      // Exclude studio floor plane if present in meshes
      if (mesh.name && mesh.name.toLowerCase().includes('studio floor')) continue;

      for (const prim of mesh.primitives || []) {
        if (prim.indices !== undefined) {
          const indexAccessor = accessors[prim.indices];
          if (indexAccessor) {
            totalTriangles += indexAccessor.count / 3;
          }
        }
      }
    }

    return Math.round(totalTriangles);
  }

  getVertexCount() {
    const meshes = this.getMeshes();
    const accessors = this.jsonChunk.accessors || [];
    let totalVertices = 0;

    for (const mesh of meshes) {
      if (mesh.name && mesh.name.toLowerCase().includes('studio floor')) continue;

      for (const prim of mesh.primitives || []) {
        if (prim.attributes && prim.attributes.POSITION !== undefined) {
          const posAccessor = accessors[prim.attributes.POSITION];
          if (posAccessor) {
            totalVertices += posAccessor.count;
          }
        }
      }
    }

    return totalVertices;
  }

  getCanCentroidAndPivot() {
    const meshes = this.getMeshes();
    const accessors = this.jsonChunk.accessors || [];

    let minY = Infinity;
    let maxY = -Infinity;

    for (const mesh of meshes) {
      if (mesh.name && mesh.name.toLowerCase().includes('studio floor')) continue;

      for (const prim of mesh.primitives || []) {
        if (prim.attributes && prim.attributes.POSITION !== undefined) {
          const posAccessor = accessors[prim.attributes.POSITION];
          if (posAccessor && posAccessor.min && posAccessor.max) {
            minY = Math.min(minY, posAccessor.min[1]);
            maxY = Math.max(maxY, posAccessor.max[1]);
          }
        }
      }
    }

    const centroidY = (minY + maxY) / 2;
    const pivotOffset = [0, -Number(centroidY.toFixed(2)), 0];

    return {
      minY,
      maxY,
      centroidY,
      pivotOffset,
    };
  }
}
