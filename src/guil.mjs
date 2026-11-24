// Rosace guillochée déterministe (style billet de banque) : une courbe, répétée par rotation avec <use>.
export function rosette(seed, uid, ink, ink2, detail) {
  let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => (h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0, (h % 10000) / 10000);
  const N = detail || 180;
  const curve = (R, A, n, k, B) => {
    let d = '';
    for (let i = 0; i <= N; i++) {
      const t = i / N * Math.PI * 2, r = R + A * Math.sin(n * t) + B * Math.sin(k * t);
      d += (i ? 'L' : 'M') + (r * Math.cos(t)).toFixed(2) + ' ' + (r * Math.sin(t)).toFixed(2);
    }
    return d + 'Z';
  };
  const bands = [
    { R: 38, A: 5 + rnd() * 3, n: 8 + (rnd() * 8 | 0), k: 3 + (rnd() * 4 | 0), B: 1.5 + rnd() * 1.5, c: 14, col: ink, w: .32 },
    { R: 24, A: 4 + rnd() * 3, n: 6 + (rnd() * 6 | 0), k: 2 + (rnd() * 3 | 0), B: 1 + rnd(), c: 12, col: ink2, w: .3 },
    { R: 11, A: 3 + rnd() * 2, n: 5 + (rnd() * 4 | 0), k: 2, B: .6, c: 9, col: ink, w: .28 }
  ];
  let defs = '', body = '';
  bands.forEach((b, j) => {
    const id = uid + 'c' + j;
    defs += `<path id="${id}" d="${curve(b.R, b.A, b.n, b.k, b.B)}"/>`;
    let u = '';
    for (let i = 0; i < b.c; i++) u += `<use href="#${id}" transform="rotate(${(i * 360 / b.n / b.c).toFixed(2)})"/>`;
    body += `<g fill="none" stroke="${b.col}" stroke-width="${b.w}" opacity=".9">${u}</g>`;
  });
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs>${defs}</defs><circle r="48.5" fill="none" stroke="${ink}" stroke-width=".8"/><circle r="47" fill="none" stroke="${ink2}" stroke-width=".3"/>${body}<circle r="3.2" fill="${ink}"/></svg>`;
}
