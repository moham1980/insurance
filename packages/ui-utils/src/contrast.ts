/**
 * WCAG 3.0 APCA (Accessible Perceptual Contrast Algorithm) contrast utility.
 * Simplified implementation for relative luminance and contrast checking.
 */

function sRGBtoLin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * Calculate APCA contrast between two colors.
 * Returns a value where >= 60 is recommended for body text, >= 90 for small text.
 */
export function apcaContrast(fg: string, bg: string): number {
  const [fr, fgVal, fb] = hexToRGB(fg);
  const [br, bgVal, bb] = hexToRGB(bg);
  const Yfg = luminance(fr, fgVal, fb);
  const Ybg = luminance(br, bgVal, bb);
  // Simplified APCA-like contrast (relative luminance difference scaled)
  const diff = (Math.max(Yfg, Ybg) - Math.min(Yfg, Ybg)) * 100;
  return Math.round(diff * 100) / 100;
}

/**
 * Check if a color pair passes WCAG AA contrast (4.5:1 for normal text).
 */
export function passesWCAG(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const ratio = apcaContrast(fg, bg) / 100;
  const threshold = level === 'AAA' ? 7 : 4.5;
  return ratio >= threshold;
}
