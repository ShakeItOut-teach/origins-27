import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("hasard semé", () => {
  it("même graine, même suite", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const a = createRng(seed);
        const b = createRng(seed);
        for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
      }),
    );
  });

  it("reste dans [0, 1)", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const rng = createRng(seed);
        for (let i = 0; i < 50; i++) {
          const x = rng.next();
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(1);
        }
      }),
    );
  });

  it("int reste dans [0, max)", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 1000 }), (seed, max) => {
        const n = createRng(seed).int(max);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(max);
      }),
    );
  });

  it("reprend la suite à partir de l'état sauvegardé", () => {
    const a = createRng(42);
    a.next();
    a.next();
    const b = createRng(a.state);
    expect(b.next()).toBe(a.next());
  });

  it("refuse un maximum invalide", () => {
    expect(() => createRng(1).int(0)).toThrow(RangeError);
    expect(() => createRng(1).int(1.5)).toThrow(RangeError);
  });

  it("deux graines différentes donnent des suites différentes", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });
});
