/**
 * Color palette constant
 */
export class ColorPalette {
  static readonly COLORS: number[] = [
    0xff0000, // Bright Red
    0x00ff00, // Bright Green
    0x0000ff, // Bright Blue
    0xffff00, // Bright Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0xff6600, // Bright Orange
    0xff0099, // Hot Pink
  ];

  static getRandomColor(): number {
    const index = Math.floor(Math.random() * this.COLORS.length);
    return this.COLORS[index];
  }
}
