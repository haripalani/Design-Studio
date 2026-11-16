import type { GarmentModel } from '@gs/core';
import { DEV_GARMENT } from './doc';

export const AVAILABLE_GARMENTS: GarmentModel[] = [
  {
    ...DEV_GARMENT,
    id: 'tee-t12',
    version: '1.0.0',
    category: 'tees',
    name: { en: 'Heavyweight T-Shirt' },
    cut: { en: 'Boxy fit · on hanger' },
    dev: false,
  },
  {
    ...DEV_GARMENT,
    id: 'tee-t5',
    version: '1.0.0',
    category: 'tees',
    name: { en: 'Classic T-Shirt' },
    cut: { en: 'Regular fit · draped' },
    dev: false,
  },
  {
    ...DEV_GARMENT,
    id: 'tee-t12-body',
    version: '1.0.0',
    category: 'tees',
    name: { en: 'T-Shirt on Body' },
    cut: { en: 'Standard fit · mannequin' },
    dev: false,
  },
  {
    ...DEV_GARMENT,
    id: 'hoodie-flat',
    version: '1.0.0',
    category: 'hoodies',
    name: { en: 'Pullover Hoodie' },
    cut: { en: 'Relaxed fit · flat lay' },
    dev: false,
  },
  {
    ...DEV_GARMENT,
    id: 'dev-procedural',
    version: '0.1.0',
    category: 'tees',
    name: { en: 'Development Tee' },
    cut: { en: 'Procedural · parametric' },
    dev: true,
  },
];

