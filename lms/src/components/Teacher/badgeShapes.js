// Badge shapes. Every path is drawn in a 100 x 100 box and used both for the live SVG preview and for the canvas
// that crops the uploaded image into the shape. Keys must match BADGE_SHAPES in backend/models/Badge.js.
const star = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * Math.PI / 180;
    const r = i % 2 === 0 ? 50 : 21;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

export const BADGE_SHAPES = [
  { key: 'circle', label: 'Circle', path: 'M50,0 A50,50 0 1,1 50,100 A50,50 0 1,1 50,0 Z' },
  { key: 'square', label: 'Rounded Square', path: 'M18,0 H82 Q100,0 100,18 V82 Q100,100 82,100 H18 Q0,100 0,82 V18 Q0,0 18,0 Z' },
  { key: 'hexagon', label: 'Hexagon', path: 'M50,0 L93.3,25 L93.3,75 L50,100 L6.7,75 L6.7,25 Z' },
  { key: 'octagon', label: 'Octagon', path: 'M30,0 L70,0 L100,30 L100,70 L70,100 L30,100 L0,70 L0,30 Z' },
  { key: 'diamond', label: 'Diamond', path: 'M50,0 L100,50 L50,100 L0,50 Z' },
  { key: 'shield', label: 'Shield', path: 'M50,0 L95,14 V50 C95,76 74,92 50,100 C26,92 5,76 5,50 V14 Z' },
  { key: 'star', label: 'Star', path: star },
  { key: 'heart', label: 'Heart', path: 'M50,95 C10,60 0,40 0,26 C0,10 12,0 27,0 C38,0 46,6 50,14 C54,6 62,0 73,0 C88,0 100,10 100,26 C100,40 90,60 50,95 Z' }
];

export const shapeByKey = (key) => BADGE_SHAPES.find(s => s.key === key) || BADGE_SHAPES[0];

/** Loads a File into an HTMLImageElement. */
export const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a readable image.')); };
  img.src = url;
});

/** Loads a URL (e.g. the bundled placeholder logo) into an HTMLImageElement. */
export const loadImageUrl = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('The placeholder image could not be loaded.'));
  img.src = src;
});

/**
 * Crops `img` to a centred square that fills the whole shape ("cover"), clips it to the shape and returns a
 * PNG data URL with a transparent background. Nothing is stretched and nothing is left empty inside the shape.
 */
export const renderBadgePng = (img, shapeKey, size = 320) => {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  const path = new Path2D(shapeByKey(shapeKey).path);
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.clip(path);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // back to pixel units; the clip region stays in force

  const side = Math.min(img.naturalWidth, img.naturalHeight);      // largest centred square of the photo
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  ctx.restore();
  return canvas.toDataURL('image/png');
};
