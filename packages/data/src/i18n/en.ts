/** English texts, in plain words. Same keys as fr.ts, enforced by the compiler. */
import type { TextKey } from "./fr";

export const en = {
  "resource.sugar": "Sugar",
  "resource.bricks": "Bricks",

  "organelle.mitochondrion.name": "Power plant",
  "organelle.mitochondrion.role": "Makes sugar on its own.",
  "organelle.vacuole.name": "Store",
  "organelle.vacuole.role": "Lets you keep more sugar and bricks.",
  "organelle.cilia.name": "Cilia",
  "organelle.cilia.role": "Each tap brings in more.",
  "organelle.ribosome.name": "Workshop",
  "organelle.ribosome.role": "Makes bricks on its own.",

  "mutation.swiftCilia.name": "Swift cilia",
  "mutation.swiftCilia.effect": "Each tap brings in half as much again.",
  "mutation.thickWall.name": "Thick wall",
  "mutation.thickWall.effect": "A quarter more room in the store.",
  "mutation.fastMetabolism.name": "Fast metabolism",
  "mutation.fastMetabolism.effect": "Sugar is made faster.",
  "mutation.digestivePouch.name": "Digestive pouch",
  "mutation.digestivePouch.effect": "Bricks are made faster.",
  "mutation.quickDivision.name": "Quick division",
  "mutation.quickDivision.effect": "Building goes faster.",
  "mutation.thrift.name": "Thrifty",
  "mutation.thrift.effect": "Building costs less.",

  "unlock.1.title": "Your cell can grow",
  "unlock.1.text": "Tap a slot to build.",
  "unlock.2.title": "Your cell has just mutated",
  "unlock.2.text": "Choose what it becomes.",

  "action.build": "Build",
  "action.upgrade": "Upgrade",
  "action.choose": "Choose",
  "action.continue": "Continue",

  "action.close": "Close",

  "hint.tap": "Tap the cell",
  "state.full": "Store full",
  "state.building": "Building",
  "label.level": "Level",
  "label.perSecond": "per second",
  "label.cell": "Your cell",

  "absence.title": "While you were away",
  "account.keep": "Find my game on another device",
} as const satisfies Record<TextKey, string>;
