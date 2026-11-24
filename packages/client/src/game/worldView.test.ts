import { describe, expect, it } from "vitest";
import { floating, panCamera, project, SPAN, TOUCH_SPAN, zoomCamera } from "./worldView";
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

  it("faire glisser déplace la vue du même écart, sans sortir de la goutte", () => {
    const moved = panCamera(camera, 0.5, 0);
    expect(project(moved, 2, -1).x).toBeCloseTo(1);
    let lost = camera;
    for (let i = 0; i < 50; i++) lost = panCamera(lost, -1, -1);
    expect(lost.x).toBeLessThanOrEqual(13);
    expect(lost.y).toBeLessThanOrEqual(13);
  });

  it("un organisme flotte près de sa case, toujours au même endroit", () => {
    for (let column = -11; column <= 11; column++) {
      for (let row = -11; row <= 11; row++) {
        const spot = floating(column, row);
        expect(Math.abs(spot.column - column)).toBeLessThan(0.23);
        expect(Math.abs(spot.row - row)).toBeLessThan(0.23);
        expect(floating(column, row)).toEqual(spot);
      }
    }
  });
});
