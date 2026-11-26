import type { OrganelleId, PreyKind, ResourceId, TroopId } from "@o27/data";

/**
 * Les pictogrammes des organites. Chacun dit **ce que fait** l'organite, pour qu'on le retienne :
 * on y retrouve le signe de la ressource qu'il produit (l'hexagone du sucre, les briques, les
 * trois grains des protéines) ou le geste qu'il fait (garder, nager, défendre, emballer).
 * Un trait à l'encre, dans la couleur du texte qui l'entoure ; les petits signes sont pleins.
 */
export function OrganelleIcon({ id }: { readonly id: OrganelleId }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const full = { fill: "currentColor", stroke: "none" };
  switch (id) {
    case "mitochondrion":
      // La Centrale fabrique du sucre : une mitochondrie, et l'hexagone du sucre qui en sort.
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="10" ry="6.6" />
          <path d="M12 8l3.4 2v4L12 16l-3.4-2v-4z" {...full} />
          <path d="M4.4 10.4l1.8 1.6-1.8 1.6M19.6 10.4l-1.8 1.6 1.8 1.6" />
        </svg>
      );
    case "vacuole":
      // La Réserve garde le sucre et les briques : un bocal, et son niveau.
      return (
        <svg {...common}>
          <path d="M7.5 3.5h9M8.5 3.5v3C6.3 7.7 5 9.900 5 12.500V17a3.500 3.500 0 0 0 3.500 3.500h7A3.500 3.500 0 0 0 19 17v-4.500c0-2.600-1.300-4.800-3.500-6v-3" />
          <path d="M5 12.500h14" />
          <path d="M8 15h3.400v2.400H8zM12.600 15H16v2.400h-3.400z" {...full} />
        </svg>
      );
    case "cilia":
      // Les Cils font nager plus vite : une cellule lancée, ses cils en arrière, son sillage.
      return (
        <svg {...common}>
          <ellipse cx="15" cy="12" rx="6" ry="4.200" />
          <path d="M9.200 10.200c-1.800-1.600-3.200-1.800-4.800-.6M9 12c-2-.900-3.600-.600-5 .800M9.200 13.800c-1.800 1.600-3.200 1.800-4.800.6" />
          <path d="M1.500 8h2M1 16h2.500" />
        </svg>
      );
    case "ribosome":
      // La Fabrique fabrique des briques : un atelier au toit en dents de scie, et ses briques.
      return (
        <svg {...common}>
          <path d="M3 20.500V9l4.500 3V9l4.500 3V9l4.500 3V5.500H21v15z" />
          <path d="M6 15.200h5v2.600H6zM12.500 15.200h5v2.600h-5z" {...full} />
        </svg>
      );
    case "golgi":
      // L'Emballeur emballe ce qu'on récolte : un colis ficelé.
      return (
        <svg {...common}>
          <path d="M4 8l8-3.500L20 8v8.500L12 20l-8-3.500z" />
          <path d="M4 8l8 3.500L20 8M12 11.500V20" />
          <path d="M8 6.300l8 3.500v3" />
        </svg>
      );
    case "nucleus":
      // Le Noyau exprime les évolutions : la double hélice.
      return (
        <svg {...common}>
          <path d="M7.500 2.500c0 5.500 9 5 9 9.500s-9 4-9 9.500M16.500 2.500c0 5.500-9 5-9 9.500s9 4 9 9.500" />
          <path d="M8.800 5.500h6.400M9.600 8.800h4.800M9.600 15.200h4.800M8.800 18.500h6.400" />
        </svg>
      );
    case "lysosome":
      // L'Estomac digère les proies : une cellule qui en avale une, et les protéines qu'elle en tire.
      return (
        <svg {...common}>
          <path d="M17.800 6.200A8.500 8.500 0 1 0 17.800 17.800" />
          <path d="M17.800 6.200c-1.600 1.400-2.400 3.400-2.400 5.800s.800 4.400 2.400 5.800" />
          <circle cx="19.600" cy="12" r="2.300" {...full} />
          <circle cx="8" cy="9.500" r="1.300" {...full} />
          <circle cx="11.500" cy="13" r="1.300" {...full} />
          <circle cx="7.500" cy="14.500" r="1.300" {...full} />
        </svg>
      );
    case "wall":
      // La Paroi défend la cellule : un bouclier.
      return (
        <svg {...common}>
          <path d="M12 2.800l7.500 2.700v5.700c0 4.600-3 8.100-7.500 10-4.500-1.900-7.500-5.400-7.500-10V5.500z" />
          <path d="M12 6.300v11.500M8 8.200v5M16 8.200v5" />
        </svg>
      );
    case "nursery":
      // La Pouponnière fait naître des cellules filles : une cellule, et sa fille qui s'en détache.
      return (
        <svg {...common}>
          <circle cx="9.500" cy="13.500" r="6.500" />
          <circle cx="18" cy="7" r="3.500" />
          <circle cx="9.500" cy="13.500" r="1.700" {...full} />
          <circle cx="18" cy="7" r="1" {...full} />
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
    case "toxic":
      // Un dinoflagellé à cornes : un corps ceinturé, une corne devant, deux derrière.
      return (
        <svg {...SMALL} className="icon-troop">
          <ellipse cx="12" cy="13" rx="5" ry="4.5" />
          <path d="M12 8.5V2M8.5 16l-4 5M15.5 16l4 5M7 13h10" />
        </svg>
      );
    case "guardian":
      // Un macrophage : une grosse cellule aux bras qui enveloppent.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M6 5c-3 3-3 11 0 14 3 2 9 2 12 0 3-3 3-11 0-14-2 3-4 4-6 4s-4-1-6-4z" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    case "scout":
      // Un trypanosome : un corps effilé qui ondule, prolongé par son flagelle.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M3 15c3-6 6 4 9-2s5 2 9-5" />
          <path d="M5 17c3-3 6 3 9-1" />
        </svg>
      );
    case "carrier":
      // Une noctiluque : un ballon, son tentacule.
      return (
        <svg {...SMALL} className="icon-troop">
          <circle cx="12" cy="10" r="7" />
          <path d="M12 17c0 3 3 3 3 5M9 9h6" />
        </svg>
      );
    case "rotifer":
      // Un rotifère : un corps en cloche, sa couronne de cils, son pied fourchu.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M7 6c0 6 1 10 5 12 4-2 5-6 5-12z" />
          <path d="M6 5c1-2 3-2 3 0M15 5c0-2 2-2 3 0M12 18v3M12 21l-2 2M12 21l2 2" />
        </svg>
      );
    case "tardigrade":
      // Un tardigrade : un corps dodu en segments, huit pattes courtes.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M4 12c0-4 3-6 8-6s8 2 8 6-3 5-8 5-8-1-8-5z" />
          <path d="M9 6.5v10M14 6.2v10.6M6 16l-1 4M10 17l-1 4M14 17l1 4M18 16l1 4" />
        </svg>
      );
    case "copepod":
      // Un copépode : un corps en goutte, deux longues antennes, une queue fourchue.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M12 4c3 0 4 3 4 6s-2 6-4 8c-2-2-4-5-4-8s1-6 4-6z" />
          <path d="M9 6C6 5 4 6 2 9M15 6c3-1 5 0 7 3M12 18l-2 4M12 18l2 4" />
        </svg>
      );
    case "salp":
      // Une salpe : un tonneau transparent, cerclé de bandes musculaires.
      return (
        <svg {...SMALL} className="icon-troop">
          <rect x="6" y="3" width="12" height="18" rx="6" />
          <path d="M6.5 8h11M6 12h12M6.5 16h11" />
        </svg>
      );
    case "chaetognath":
      // Un chétognathe : un corps en flèche, des crochets à la tête, des nageoires en losange.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M12 2v20M12 4l-3-2M12 4l3-2M12 10l-4 3 4 3 4-3zM12 19l-3 3M12 19l3 3" />
        </svg>
      );
    case "ostracod":
      // Un ostracode : deux valves en haricot, des antennes qui dépassent.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M4 13c0-5 4-8 9-8s7 3 7 7-3 7-8 7-8-2-8-6z" />
          <path d="M6 13c3-2 9-2 13-1M19 9l3-3M18 7l2-4" />
        </svg>
      );
    case "krill":
      // Du krill : un corps arqué, de longues antennes, des pattes en peigne.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M4 15c2-6 8-9 14-7 2 1 2 3 0 4-4 1-8 1-10 5" />
          <path d="M18 8l4-4M17 8l1-5M9 13v4M12 12v4M15 12v3" />
        </svg>
      );
    case "larvacean":
      // Un appendiculaire : un petit corps dans sa logette de mucus, une queue qui bat.
      return (
        <svg {...SMALL} className="icon-troop">
          <circle cx="11" cy="11" r="8" />
          <circle cx="9" cy="9" r="2" />
          <path d="M10 11c3 1 5 4 9 9" />
        </svg>
      );
    case "eurypterid":
      // Un euryptéride : un corps de scorpion, deux pinces, une queue en pointe.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M12 6c3 0 4 3 4 6s-2 5-4 5-4-2-4-5 1-6 4-6zM12 17v5" />
          <path d="M9 7C7 5 5 5 4 3M15 7c2-2 4-2 5-4M8 11H4M16 11h4M8 14l-3 2M16 14l3 2" />
        </svg>
      );
    case "trilobite":
      // Un trilobite : trois lobes, des segments, un bouclier sur la tête.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M12 3c4 0 7 3 7 9s-3 9-7 9-7-3-7-9 3-9 7-9z" />
          <path d="M9 4v16M15 4v16M5.5 9h13M5 12h14M5.5 15h13M7 18h10" />
        </svg>
      );
    case "conodont":
      // Un conodonte : un corps d'anguille, de grands yeux, une nageoire au bout.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M3 9c4-4 6 6 10 2s5-5 8-3l-2 3 2 3c-3 1-5-1-8 2s-7 0-10-7z" />
          <circle cx="6" cy="9" r="1" />
        </svg>
      );
    case "nautiloid":
      // Un nautiloïde : une coquille enroulée et cloisonnée, des bras devant.
      return (
        <svg {...SMALL} className="icon-troop">
          <path d="M14 20a8 8 0 1 1 6-13" />
          <path d="M14 14a3 3 0 1 1 3-5M20 7l2 4M19 9l1 5M17 10v5M8 6v6M11 5l1 5" />
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
