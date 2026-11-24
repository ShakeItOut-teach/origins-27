import { describe, expect, it } from "vitest";
import { BALANCE } from "@o27/data";
import { BUBBLE_SHOWS, bubbleAngle, bubbleAt } from "./RaidBubble";

describe("la bulle à attraper", () => {
  it("chaque bulle reste moins de deux secondes, et toutes tiennent dans le combat", () => {
    const windowMs = BALANCE.hunt.strikeWindowSeconds * 1000;
    let previousEnd = 0;
    for (const show of BUBBLE_SHOWS) {
      expect(show.life).toBeLessThan(2000);
      expect(show.start).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = show.start + show.life;
    }
    expect(previousEnd).toBeLessThanOrEqual(windowMs);
  });

  it("entre deux bulles, il n'y a rien à toucher", () => {
    expect(bubbleAt(0)).toBeNull();
    expect(bubbleAt(BUBBLE_SHOWS[0].start)).toEqual({ index: 0, age: 0 });
    expect(bubbleAt(BUBBLE_SHOWS[0].start + BUBBLE_SHOWS[0].life)).toBeNull();
    expect(bubbleAt(BUBBLE_SHOWS[1].start + 500)).toEqual({ index: 1, age: 500 });
    expect(bubbleAt(60_000)).toBeNull();
  });

  it("la direction est toujours la même pour un même combat", () => {
    expect(bubbleAngle(1_800_000_123_456, 0)).toBe(bubbleAngle(1_800_000_123_456, 0));
    expect(bubbleAngle(1_800_000_123_456, 0)).toBeGreaterThanOrEqual(0);
    expect(bubbleAngle(1_800_000_123_456, 1)).toBeLessThan(360);
  });
});
