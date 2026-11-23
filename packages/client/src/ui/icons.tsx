import type { OrganelleId, PreyKind, ResourceId, TroopId } from "@o27/data";

/** Petits dessins à l'encre, dans la couleur du texte qui les entoure. */
export function OrganelleIcon({ id }: { readonly id: OrganelleId }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "mitochondrion":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="5.5" />
          <path d="M6 12l3-2.5 3 5 3-5 3 2.5" />
        </svg>
      );
    case "vacuole":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 9.5a4 4 0 0 1 3-2" />
        </svg>
      );
    case "cilia":
      return (
        <svg {...common}>
          <path d="M4 19c4-3 12-3 16 0" />
          <path d="M6 16l-1-6M10 15l-.5-8M14 15l.5-8M18 16l1-6" />
        </svg>
      );
    case "ribosome":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="2.4" />
          <circle cx="7.5" cy="14.5" r="2.4" />
          <circle cx="16.5" cy="14.5" r="2.4" />
        </svg>
      );
    case "nursery":
      // Une cellule en train de se diviser.
      return (
        <svg {...common}>
          <circle cx="8.5" cy="12" r="5" />
          <circle cx="15.5" cy="12" r="5" />
        </svg>
      );
  }
}

export function ResourceIcon({ id }: { readonly id: ResourceId }) {
  if (id === "proteins") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="icon-proteins">
        <circle cx="7" cy="7" r="3.5" fill="currentColor" />
        <circle cx="16" cy="9" r="3.5" fill="currentColor" />
        <circle cx="10" cy="16.5" r="3.5" fill="currentColor" />
      </svg>
    );
  }
  return id === "sugar" ? (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="icon-sugar">
      <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" fill="currentColor" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="icon-bricks">
      <rect x="3" y="5" width="18" height="6" rx="1" fill="currentColor" />
      <rect x="3" y="13" width="8" height="6" rx="1" fill="currentColor" />
      <rect x="13" y="13" width="8" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export function EnergyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="icon-energy">
      <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor" />
    </svg>
  );
}

const SMALL = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Les trois cellules filles : une pointe, un bouclier, une flèche. */
export function TroopIcon({ id }: { readonly id: TroopId }) {
  switch (id) {
    case "hunter":
      return (
        <svg {...SMALL} className="icon-troop">
          <circle cx="12" cy="13" r="6" />
          <path d="M12 7V2M9 4l3-2 3 2" />
        </svg>
      );
    case "armored":
      return (
        <svg {...SMALL} className="icon-troop">
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "swift":
      return (
        <svg {...SMALL} className="icon-troop">
          <ellipse cx="13" cy="12" rx="7" ry="4" />
          <path d="M2 9h3M1 12h4M2 15h3" />
        </svg>
      );
  }
}

/** Les trois proies : une masse molle, une masse à piquants, une forme qui file. */
export function PreyIcon({ kind }: { readonly kind: PreyKind }) {
  switch (kind) {
    case "soft":
      return (
        <svg {...SMALL} className="icon-prey">
          <path d="M5 13c0-5 3-8 7-8s7 3 7 8-3 6-7 6-7-1-7-6z" />
          <circle cx="10" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "aggressive":
      return (
        <svg {...SMALL} className="icon-prey">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2" />
        </svg>
      );
    case "fleeing":
      return (
        <svg {...SMALL} className="icon-prey">
          <path d="M4 12c3-5 9-5 13 0-4 5-10 5-13 0z" />
          <path d="M17 12l4-3v6z" />
        </svg>
      );
  }
}
