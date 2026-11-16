import * as THREE from 'three';

export interface RealGarmentMesh {
  pos: Float32Array;
  nor?: Float32Array | Int8Array;
  uv?: Float32Array;
  uv1?: Float32Array;
  idx: Uint32Array | Uint16Array;
}

export interface PieceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RealGarmentData {
  id: string;
  size: number;
  pxPerCm: number;
  thick?: boolean;
  normalMapUrl?: string;
  pieces: Map<string, PieceBox>;
  shirt: RealGarmentMesh;
  hanger?: RealGarmentMesh;
  hook?: RealGarmentMesh;
  stitch?: RealGarmentMesh;
}

const cache = new Map<string, RealGarmentData>();

export function buildBufferGeometry(mesh: RealGarmentMesh, scale = 0.01): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const rawPos = mesh.pos;
  const scaledPos = new Float32Array(rawPos.length);
  for (let i = 0; i < rawPos.length; i++) {
    scaledPos[i] = (rawPos[i] ?? 0) * scale;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(scaledPos, 3));

  if (mesh.nor) {
    const isNormalized = typeof Int8Array !== 'undefined' && mesh.nor instanceof Int8Array;
    geom.setAttribute('normal', new THREE.BufferAttribute(mesh.nor, 3, isNormalized));
  } else {
    geom.computeVertexNormals();
  }

  if (mesh.uv) {
    geom.setAttribute('uv', new THREE.BufferAttribute(mesh.uv, 2));
  }
  if (mesh.uv1) {
    geom.setAttribute('uv1', new THREE.BufferAttribute(mesh.uv1, 2));
  }

  geom.setIndex(new THREE.BufferAttribute(mesh.idx, 1));
  geom.computeBoundingBox();
  return geom;
}

async function decompressGzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(buf);
    writer.close();
    const res = new Response(ds.readable);
    return res.arrayBuffer();
  }
  // Node fallback
  const zlibMod = await (new Function('return import("node:zlib")')() as Promise<any>);
  const decomp = zlibMod.gunzipSync(new Uint8Array(buf));
  return decomp.buffer.slice(decomp.byteOffset, decomp.byteOffset + decomp.byteLength);
}

export async function decodeModelBin(compressedBuffer: ArrayBuffer, id: string): Promise<RealGarmentData> {
  const arrayBuffer = await decompressGzip(compressedBuffer);
  const dataView = new DataView(arrayBuffer);
  const jsonLen = dataView.getUint32(0, true);
  const dataStart = 4 + jsonLen;
  const jsonStr = new TextDecoder().decode(new Uint8Array(arrayBuffer, 4, jsonLen));
  const model = JSON.parse(jsonStr);

  const unpackChannels = (desc: any, stride: number): ArrayBuffer => {
    const n = Number(desc.n);
    const offset = Number(desc['@']);
    const raw = new Uint8Array(arrayBuffer, dataStart + offset, n * stride);
    const out = new Uint8Array(n * stride);
    for (let c = 0; c < stride; c++) {
      for (let i = 0, src = c * n; i < n; i++) {
        out[i * stride + c] = raw[src + i] ?? 0;
      }
    }
    return out.buffer;
  };

  const decodeAttribute = (desc: any): any => {
    const offset = Number(desc['@']);
    const n = Number(desc.n);
    if (desc.e === 'i8') {
      return new Int8Array(arrayBuffer.slice(dataStart + offset, dataStart + offset + n));
    }
    if (desc.e === 'q16d') {
      const diffs = new Int16Array(unpackChannels(desc, 2));
      const channels = Number(desc.c);
      const result = new Float32Array(n);
      const acc = new Int32Array(channels);
      for (let i = 0; i < n; i++) {
        const c = i % channels;
        const diff = diffs[i] ?? 0;
        acc[c] = ((acc[c] ?? 0) + diff) & 0xffff;
        const lo = Number(desc.lo[c] ?? 0);
        const hi = Number(desc.hi[c] ?? 0);
        result[i] = lo + ((acc[c] ?? 0) / 0xffff) * (hi - lo);
      }
      return result;
    }
    if (desc.e === 'zz32d') {
      const diffs = new Uint32Array(unpackChannels(desc, 4));
      const result = desc.big ? new Uint32Array(n) : new Uint16Array(n);
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const m = diffs[i] ?? 0;
        acc += (m >>> 1) ^ -(m & 1);
        result[i] = acc;
      }
      return result;
    }
    throw new Error('Unknown encoding ' + desc.e);
  };

  for (const key of ['shirt', 'hanger', 'hook', 'stitch', 'altShirt']) {
    const val = model[key];
    if (val && typeof val === 'object' && val.idx && val.idx['@'] !== undefined) {
      for (const attr of ['pos', 'nor', 'uv', 'uv1', 'idx']) {
        if (val[attr]) {
          val[attr] = decodeAttribute(val[attr]);
        }
      }
    }
  }

  const pieces = new Map<string, PieceBox>();
  if (Array.isArray(model.pieces)) {
    for (const p of model.pieces) {
      if (Array.isArray(p.pts) && p.pts.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const pt of p.pts) {
          const x = Number(pt[0]), y = Number(pt[1]);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        pieces.set(p.id, {
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
        });
      }
    }
  }

  const result: RealGarmentData = {
    id: model.id || id,
    size: Number(model.size) || 2048,
    pxPerCm: Number(model.pxPerCm) || 16,
    thick: model.thick,
    normalMapUrl: `/garments/${id}/normal.jpg`,
    pieces,
    shirt: model.shirt,
    hanger: model.hanger,
    hook: model.hook,
    stitch: model.stitch,
  };

  cache.set(id, result);
  return result;
}

export async function loadRealGarment(id: string): Promise<RealGarmentData | null> {
  const cached = cache.get(id);
  if (cached) return cached;

  // Browser fetch
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/garments/${id}/model.bin`);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return await decodeModelBin(ab, id);
      }
    } catch {
      // ignore
    }
  }

  // Node fallback (tests / CLI)
  const g = globalThis as any;
  if (typeof g.process !== 'undefined' && g.process.versions?.node) {
    try {
      const fs = await (new Function('return import("node:fs")')() as Promise<any>);
      const path = await (new Function('return import("node:path")')() as Promise<any>);
      const cwd = g.process.cwd();
      const pathsToTry = [
        path.resolve(cwd, `apps/editor/public/garments/${id}/model.bin`),
        path.resolve(cwd, `packages/engine-3d/assets/garments/${id}/model.bin`),
        path.resolve(cwd, `../../apps/editor/public/garments/${id}/model.bin`),
        path.resolve(cwd, `assets/garments/${id}/model.bin`),
      ];
      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          return await decodeModelBin(ab, id);
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}
