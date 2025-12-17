# Geometric Shapes App (Pixi.js + Matter.js)

Implements the requirements from the Games Client Development Test.

## Features

- Rectangular canvas area with masking (shapes can exist offscreen)
- Shapes fall from top to bottom under gravity
- Auto-generation of random shapes at 1 shape/action (adjustable)
- Click inside to spawn a shape at cursor; click a shape to delete it
- Top-left stats: number of shapes and total surface area (px²)
- Shape types: Triangle, Rectangle, Pentagon, Hexagon, Circle, Ellipse, Star
- Bonus controls (HTML): adjust shapes/action and gravity

## Run

Install deps and start the dev server:

```bash
npm install
npm run dev
```

By default it serves on port 3000. If the port is busy, change `devServer.port` in [webpack.config.js](webpack.config.js).

Production build:

```bash
npm run build
```

## Controls

- Start: Click the canvas or press Enter
- Spawn: Click within the canvas will create only random shapes
- Spawn chosen shape: Choose from dropdown a shape then click "Create" button
- Auto spawning shapes: Automatically spawning shapes chosen inside the dropdown at a frequency of 1 shape per second.
- Delete: Click a shape
- Delete all: Press "Esc"
- Bottom controls:
  - Shapes/action: `-` / `+`
  - Gravity: `-` / `+`

## Notes

- The ellipse body is approximated with a 20-vertex polygon for physics.
- Surface area uses each shape's formula; star area is approximate.
