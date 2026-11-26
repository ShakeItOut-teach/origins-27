import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * Le coffre : un champignon gravé, sur la planche noire. Fermé, un voile cache ses lamelles ;
 * ouvert, le chapeau se soulève, le voile tombe et les spores s'échappent.
 * Relief de la charte : lumière en haut à gauche, ombre portée en bas à droite, reflet couleur
 * d'os du côté de la lumière, hachures du côté de l'ombre, un lavis de la teinte du coffre.
 */
const CAP =
  "M22 88 C22 52 48 28 80 28 C112 28 138 52 138 88 C124 96 102 99 80 99 C58 99 36 96 22 88 Z";
const STEM = "M68 98 C66 120 62 138 57 152 L103 152 C98 138 94 120 92 98 Z";
const VEIL = "M26 90 C46 104 114 104 134 90 C122 110 38 110 26 90 Z";
/** Les taches du chapeau, comme sur une amanite : cx, cy, rayon. */
const WARTS: readonly (readonly [number, number, number])[] = [
  [55, 52, 5],
  [83, 40, 4],
  [107, 56, 6],
  [69, 72, 3.5],
  [96, 77, 3],
  [40, 74, 3],
];

/** Les spores : une gerbe vers le haut et les côtés, toujours la même (aucun hasard). */
const SPORES = Array.from({ length: 44 }, (_, index) => {
  // De −195° à +15° : vers le haut, mais surtout de part et d'autre du chapeau.
  const angle = (-195 + ((index * 47) % 210)) * (Math.PI / 180);
  const reach = 50 + ((index * 29) % 60);
  return {
    x: 80 + ((index % 5) - 2) * 6,
    y: 100,
    r: 2 + ((index * 13) % 10) / 5,
    dx: Math.round(Math.cos(angle) * reach),
    dy: Math.round(Math.sin(angle) * reach - 18),
    delay: (index % 11) * 0.06,
  };
});

export function SporeChest() {
  const id = useId().replace(/:/g, "");
  const capClip = `cap-${id}`;
  const stemClip = `stem-${id}`;
  const wash = `wash-${id}`;
  return (
    <svg viewBox="0 0 160 170" aria-hidden="true" className="spore-chest">
      <defs>
        <clipPath id={capClip}>
          <path d={CAP} />
        </clipPath>
        <clipPath id={stemClip}>
          <path d={STEM} />
        </clipPath>
        <filter id={wash} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Le sol : une motte hachurée, son ombre. */}
      <ellipse className="spore-ground" cx="84" cy="155" rx="54" ry="8" />
      <g className="spore-ground-hatch">
        {[40, 52, 64, 76, 88, 100, 112, 124].map((x) => (
          <line key={x} x1={x} y1="152" x2={x + 8} y2="160" />
        ))}
      </g>

      {/* L'ombre portée du pied, en bas à droite. */}
      <path className="spore-shadow" d={STEM} transform="translate(6 4)" />

      {/* Le pied, son anneau, ses hachures côté ombre, son reflet côté lumière. */}
      <path className="spore-stem" d={STEM} />
      <g clipPath={`url(#${stemClip})`} className="spore-hatch">
        {[86, 91, 96, 101].map((x) => (
          <line key={x} x1={x} y1="98" x2={x + 4} y2="152" />
        ))}
      </g>
      <path className="spore-glint" d="M70 106 C69 122 66 136 62 148" />
      <path className="spore-ring" d="M63 116 C72 123 88 123 97 116" />

      {/* Le chapeau : il se soulève à l'ouverture. */}
      <g className="spore-cap">
        <path className="spore-shadow" d={CAP} transform="translate(6 5)" />
        {/* Les lamelles, sous le chapeau : on les voit quand le voile tombe. */}
        <g className="spore-gills">
          {[30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((x) => (
            <line key={x} x1={x} y1={88 + Math.abs(x - 80) * -0.06 + 6} x2="80" y2="104" />
          ))}
        </g>
        {/* Gravure : le papier, puis le lavis par-dessus (flou, décalé), puis les hachures. */}
        <path className="spore-cap-paper" d={CAP} />
        <path className="spore-wash" d={CAP} transform="translate(4 3)" filter={`url(#${wash})`} />
        <g clipPath={`url(#${capClip})`} className="spore-hatch">
          {[92, 99, 106, 113, 120, 127, 134, 141].map((x) => (
            <line key={x} x1={x} y1="30" x2={x + 16} y2="100" />
          ))}
          {[112, 122, 132].map((x) => (
            <line key={`x${String(x)}`} x1={x + 20} y1="60" x2={x - 4} y2="100" />
          ))}
          {/* Le bord du chapeau, dans l'ombre : de courts traits serrés. */}
          {[30, 38, 46, 54, 62, 70, 78, 86, 94, 102, 110, 118, 126].map((x) => (
            <line key={`b${String(x)}`} x1={x} y1="86" x2={x + 3} y2="99" />
          ))}
        </g>
        <path className="spore-cap-body" d={CAP} />
        {WARTS.map(([cx, cy, r]) => (
          <circle
            key={`${String(cx)}-${String(cy)}`}
            className="spore-wart"
            cx={cx}
            cy={cy}
            r={r}
          />
        ))}
        <path className="spore-glint" d="M36 74 C40 54 54 41 72 36" />
        <path className="spore-veil" d={VEIL} />
      </g>

      {/* Les spores, qui ne partent qu'à l'ouverture. */}
      <g className="spore-cloud">
        {SPORES.map((spore, index) => (
          <circle
            key={index}
            className="spore"
            cx={spore.x}
            cy={spore.y}
            r={spore.r}
            style={
              {
                "--spore-dx": `${String(spore.dx)}px`,
                "--spore-dy": `${String(spore.dy)}px`,
                "--spore-delay": `${String(spore.delay)}s`,
              } as CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  );
}
