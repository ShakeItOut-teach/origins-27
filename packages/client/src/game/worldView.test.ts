import { describe, expect, it } from "vitest";
import {
  labelSpot,
  NAME_SPAN,
  panCamera,
  project,
  SPAN,
  TOUCH_SPAN,
  zoomCamera,
} from "./worldView";
import type { WorldCamera } from "./worldView";

describe("le cadrage de la grande carte", () => {
  const camera: WorldCamera = { x: 2, y: -1, span: SPAN.start };

  it("le centre de la vue est au milieu de la lame", () => {
    expect(project(camera, 2, -1)).toEqual({ x: 0.5, y: 0.5 });
    expect(project(camera, 2 + SPAN.start / 2, -1).x).toBeCloseTo(1);
  });

  it("on ne recule ni ne s'approche au-delà des limites", () => {
    let far = camera;
    let near = camera;
    for (let i = 0; i < 30; i++) {
      far = zoomCamera(far, 1.4);
      near = zoomCamera(near, 1 / 1.4);
    }
    expect(far.span).toBe(SPAN.max);
    expect(near.span).toBe(SPAN.min);
  });

  it("à l'ouverture, les organismes sont assez gros pour être touchés", () => {
    expect(SPAN.start).toBeLessThanOrEqual(TOUCH_SPAN);
  });

  it("à l'ouverture, rivaux et prédateurs portent leur nom, et seulement là où on peut les toucher", () => {
    expect(SPAN.start).toBeLessThanOrEqual(NAME_SPAN);
    expect(NAME_SPAN).toBeLessThanOrEqual(TOUCH_SPAN);
  });

  it("faire glisser déplace la vue du même écart, sans sortir de la goutte", () => {
    const moved = panCamera(camera, 0.5, 0);
    expect(project(moved, 2, -1).x).toBeCloseTo(1);
    let lost = camera;
    for (let i = 0; i < 50; i++) lost = panCamera(lost, -1, -1);
    expect(lost.x).toBeLessThanOrEqual(126);
    expect(lost.y).toBeLessThanOrEqual(126);
  });

  it("sur un écran en hauteur ou en largeur, une case reste carrée", () => {
    const view: WorldCamera = { x: 0, y: 0, span: 40 };
    // Écran deux fois plus haut que large : 40 cases en largeur, 80 en hauteur.
    expect(project(view, 20, 0, 2).x).toBeCloseTo(1);
    expect(project(view, 0, 40, 2).y).toBeCloseTo(1);
    // Écran deux fois plus large que haut : 40 cases en hauteur, 80 en largeur.
    expect(project(view, 40, 0, 0.5).x).toBeCloseTo(1);
    expect(project(view, 0, 20, 0.5).y).toBeCloseTo(1);
    expect(labelSpot(view, 30, 2)).toEqual(project(view, 0, -30, 2));
  });

  it("de très loin, l'océan entier est centré dans la lame", () => {
    let far: WorldCamera = { x: 100, y: -90, span: SPAN.start };
    for (let i = 0; i < 30; i++) far = zoomCamera(far, 1.6);
    expect(far.span).toBe(SPAN.max);
    expect(far.x).toBeCloseTo(0);
    expect(far.y).toBeCloseTo(0);
  });

  it("la profondeur d'un cercle s'écrit là où il passe le plus près du regard", () => {
    const east: WorldCamera = { x: 100, y: 0, span: 30 };
    expect(labelSpot(east, 98)).toEqual(project(east, 98, 0));
    const centre: WorldCamera = { x: 0, y: 0, span: 264 };
    expect(labelSpot(centre, 50)).toEqual(project(centre, 0, -50));
  });
});
