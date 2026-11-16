// Garments available without the catalogue API: the procedural development garments (ADR-0007).
import { createDevHoodie } from './devHoodie';
import { createDevTee } from './devTee';
import type { GarmentModel } from './garment';

const FACTORIES: Record<string, () => GarmentModel> = {
  'dev-tee': createDevTee,
  'dev-hoodie': createDevHoodie,
};
const cache = new Map<string, GarmentModel>();

/** All development garments, in picker order. */
export function devGarments(): GarmentModel[] {
  return Object.keys(FACTORIES).map((id) => devGarment(id)!);
}

/** A development garment by id (built once and shared), or undefined. */
export function devGarment(id: string): GarmentModel | undefined {
  const make = FACTORIES[id];
  if (!make) return undefined;
  let g = cache.get(id);
  if (!g) cache.set(id, (g = make()));
  return g;
}
