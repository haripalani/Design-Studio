// Procedural development hoodie (ADR-0007 fallback): our own pattern, generated from parameters.
// Pullover with a drop shoulder, long tapered sleeves with rib cuffs, a rib waistband, a two-piece
// hood (centre seam) and a kangaroo pocket stitched onto the front.
import { Outline, EN, body, mark, normalise, rect, sleeve } from './devTee';
import type { GarmentModel, PieceDef, SeamDef } from './garment';
import type { Vec } from './geometry';

const W = 580; // body width
const H = 700; // body length (to the waistband seam)
const POCKET = { w: 330, h: 190 };

/** One hood half (side view): face opening at the left, centre-back seam at the right, neckline at the bottom. */
function hoodHalf(): Outline {
  return new Outline()
    .move([22, 385], 'neckF')
    .line([0, 70], 'faceTop')
    .curve([18, 6], [150, -8], [232, 64], 'crown')
    .curve([272, 112], [268, 262], [250, 385], 'neckB');
}

function mirrorX(o: Outline): Outline {
  const maxX = Math.max(...o.pts.map((p) => p[0]));
  const m = new Outline();
  m.pts = o.pts.map(([x, y]) => [maxX - x, y] as Vec);
  m.marks = { ...o.marks };
  return m;
}

/** Kangaroo pocket: straight top and bottom, slanted hand openings at the sides. */
function pocket(): Outline {
  const { w, h } = POCKET;
  return new Outline()
    .move([62, 0], 'tl')
    .line([w - 62, 0], 'tr')
    .line([w, h * 0.52], 'openR')
    .line([w, h], 'br')
    .line([0, h], 'bl')
    .line([0, h * 0.52], 'openL');
}

export function createDevHoodie(): GarmentModel {
  const front = normalise(body({ w: W, h: H, neckW: 200, neckD: 70, inset: 42, slope: 42, armD: 265 }));
  const back = normalise(body({ w: W, h: H, neckW: 200, neckD: 25, inset: 42, slope: 42, armD: 265 }));
  const sr = normalise(sleeve(440, 600, 130, 110));
  const sl = normalise(sleeve(440, 600, 130, 110));
  const hoodL = normalise(hoodHalf());
  const hoodR = normalise(mirrorX(hoodHalf()));
  const pk = normalise(pocket());
  const bandF = normalise(rect(540, 80));
  const bandB = normalise(rect(540, 80));
  const cuffR = normalise(rect(220, 80));
  const cuffL = normalise(rect(220, 80));

  const piece = (
    id: string,
    role: string,
    name: string,
    outlineMm: Vec[],
    sides: PieceDef['sides'],
    layoutMm: PieceDef['layoutMm'],
    extra: Partial<PieceDef> = {},
  ): PieceDef => ({ id, role, name: EN(name), outlineMm, cut: 1, sides, layoutMm, ...extra });

  const both = (x: number, y: number) => ({ outside: [x, y] as Vec, inside: [x, y] as Vec });
  const pieces: PieceDef[] = [
    piece('front', 'front', 'Front', front.pts, ['outside', 'inside'], both(0, 520), { centreLine: true }),
    piece('back', 'back', 'Back', back.pts, ['outside', 'inside'], both(640, 520), { centreLine: true }),
    piece('sleeveR', 'sleeveR', 'Right sleeve', sr.pts, ['outside', 'inside'], both(1280, 520), { centreLine: true }),
    piece('sleeveL', 'sleeveL', 'Left sleeve', sl.pts, ['outside', 'inside'], both(1780, 520), { centreLine: true }),
    piece('hoodL', 'hood', 'Hood · left', hoodL.pts, ['outside', 'inside'], both(0, 60)),
    piece('hoodR', 'hood', 'Hood · right', hoodR.pts, ['outside', 'inside'], both(310, 60)),
    piece('pocket', 'pocket', 'Kangaroo pocket', pk.pts, ['outside'], { outside: [660, 200] }, {
      placedOn: { piece: 'front', at: [(W - POCKET.w) / 2, H - POCKET.h - 45] },
    }),
    piece('bandFront', 'band', 'Waistband · front', bandF.pts, ['outside'], { outside: [20, 1260] }),
    piece('bandBack', 'band', 'Waistband · back', bandB.pts, ['outside'], { outside: [660, 1260] }),
    piece('cuffR', 'cuff', 'Right cuff', cuffR.pts, ['outside'], { outside: [1390, 1170] }),
    piece('cuffL', 'cuff', 'Left cuff', cuffL.pts, ['outside'], { outside: [1890, 1170] }),
    piece('label', 'label', 'Label', normalise(rect(50, 34)).pts, ['inside'], { inside: [1100, 200] }),
  ];

  const m = mark;
  const seams: SeamDef[] = [
    // Body: shoulders and side seams, front left (viewer) = wearer's right = back right (from behind).
    { a: { piece: 'front', from: m(front, 'neckL'), to: m(front, 'shL') }, b: { piece: 'back', from: m(back, 'neckR'), to: m(back, 'shR') } },
    { a: { piece: 'front', from: m(front, 'neckR'), to: m(front, 'shR') }, b: { piece: 'back', from: m(back, 'neckL'), to: m(back, 'shL') } },
    { a: { piece: 'front', from: m(front, 'armL'), to: m(front, 'hemL') }, b: { piece: 'back', from: m(back, 'armR'), to: m(back, 'hemR') } },
    { a: { piece: 'front', from: m(front, 'armR'), to: m(front, 'hemR') }, b: { piece: 'back', from: m(back, 'armL'), to: m(back, 'hemL') } },
    // Armholes to sleeve caps.
    { a: { piece: 'front', from: m(front, 'shL'), to: m(front, 'armL') }, b: { piece: 'sleeveR', from: m(sr, 'top'), to: m(sr, 'capL') } },
    { a: { piece: 'back', from: m(back, 'shR'), to: m(back, 'armR') }, b: { piece: 'sleeveR', from: m(sr, 'top'), to: m(sr, 'capR') } },
    { a: { piece: 'front', from: m(front, 'shR'), to: m(front, 'armR') }, b: { piece: 'sleeveL', from: m(sl, 'top'), to: m(sl, 'capR') } },
    { a: { piece: 'back', from: m(back, 'shL'), to: m(back, 'armL') }, b: { piece: 'sleeveL', from: m(sl, 'top'), to: m(sl, 'capL') } },
    // Rib waistband under each hem, rib cuffs at the sleeve ends (hem left → right meets band top).
    { a: { piece: 'front', from: m(front, 'hemL'), to: m(front, 'hemR') }, b: { piece: 'bandFront', from: m(bandF, 'tl'), to: m(bandF, 'tr') } },
    { a: { piece: 'back', from: m(back, 'hemL'), to: m(back, 'hemR') }, b: { piece: 'bandBack', from: m(bandB, 'tl'), to: m(bandB, 'tr') } },
    { a: { piece: 'sleeveR', from: m(sr, 'hemL'), to: m(sr, 'hemR') }, b: { piece: 'cuffR', from: m(cuffR, 'tl'), to: m(cuffR, 'tr') } },
    { a: { piece: 'sleeveL', from: m(sl, 'hemL'), to: m(sl, 'hemR') }, b: { piece: 'cuffL', from: m(cuffL, 'tl'), to: m(cuffL, 'tr') } },
    // Hood centre-back seam: crown to neck on both halves.
    { a: { piece: 'hoodL', from: m(hoodL, 'crown'), to: m(hoodL, 'neckB') }, b: { piece: 'hoodR', from: m(hoodR, 'crown'), to: m(hoodR, 'neckB') } },
  ];

  return {
    id: 'dev-hoodie',
    version: '0.1.0',
    category: 'hoodie',
    name: EN('Development hoodie'),
    cut: EN('Procedural · pullover, kangaroo pocket'),
    dev: true,
    flatLay: { sleeveDropDeg: 62 },
    pieces,
    seams,
    presets: {
      chest: { piece: 'front', side: 'outside', fx: 0.5, fy: 0.36, fw: 0.42 },
      leftChest: { piece: 'front', side: 'outside', fx: 0.7, fy: 0.26, fw: 0.15 },
      frontBottom: { piece: 'pocket', side: 'outside', fx: 0.5, fy: 0.55, fw: 0.5 },
      back: { piece: 'back', side: 'outside', fx: 0.5, fy: 0.55, fw: 0.5 },
      backNeck: { piece: 'hoodL', side: 'outside', fx: 0.55, fy: 0.45, fw: 0.5 },
      rightSleeve: { piece: 'sleeveR', side: 'outside', fx: 0.4, fy: 0.55, fw: 0.22 },
      leftSleeve: { piece: 'sleeveL', side: 'outside', fx: 0.6, fy: 0.55, fw: 0.22 },
      label: { piece: 'label', side: 'inside', fx: 0.5, fy: 0.5, fw: 0.8 },
      printedLabel: { piece: 'back', side: 'inside', fx: 0.5, fy: 0.09, fw: 0.18 },
    },
  };
}
