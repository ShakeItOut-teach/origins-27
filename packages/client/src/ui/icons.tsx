import type { OrganelleId, ResourceId } from "@o27/data";

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
  }
}

export function ResourceIcon({ id }: { readonly id: ResourceId }) {
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
