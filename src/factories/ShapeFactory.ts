import {
  Shape,
  Circle,
  Square,
  Rectangle,
  Triangle,
  Star,
  Pentagon,
  Hexagon,
  Ellipse,
  Irregular,
} from "../shapes/Shape";
import { ColorPalette } from "../constants/ColorPalette";

type ShapeConstructor = new (
  x: number,
  y: number,
  size: number,
  color: number
) => Shape;

/**
 * Factory pattern for creating random shapes
 */
export class ShapeFactory {
  private shapeTypes: ShapeConstructor[] = [
    Circle,
    Square,
    Rectangle,
    Triangle,
    Star,
    Pentagon,
    Hexagon,
    Ellipse,
    Irregular,
  ];

  createShape(x: number, y: number, shapeType?: string | null): Shape | null {
    const isPhone = (window.innerWidth || 800) < 480;
    const size = isPhone ? 33 : 75;
    const color = ColorPalette.getRandomColor();
    const type = shapeType?.trim().toLowerCase();
    // Start shapes above the visible canvas by their size
    const spawnY = shapeType ? -size : y;
    const ShapeClass =
      type === "random"
        ? this.getRandomShapeType()
        : type === "circle"
        ? this.shapeTypes[0]
        : type === "square"
        ? this.shapeTypes[1]
        : type === "rectangle"
        ? this.shapeTypes[2]
        : type === "triangle"
        ? this.shapeTypes[3]
        : type === "star"
        ? this.shapeTypes[4]
        : type === "pentagon"
        ? this.shapeTypes[5]
        : type === "hexagon"
        ? this.shapeTypes[6]
        : type === "ellipse"
        ? this.shapeTypes[7]
        : type === "irregular"
        ? this.shapeTypes[8]
        : this.getRandomShapeType();

    const shape = new ShapeClass(x, spawnY, size, color);
    shape.draw();

    return shape;
  }
  private getRandomShapeType(): ShapeConstructor {
    const index = Math.floor(Math.random() * this.shapeTypes.length);
    return this.shapeTypes[index];
  }
}
