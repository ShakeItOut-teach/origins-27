interface Props {
  /** La teinte du rival : la même que sur la carte. */
  readonly hue: number;
  /** Son identifiant : il fixe sa silhouette, toujours la même pour un même rival. */
  readonly seed: string;
}

/** Un nombre stable tiré d'un texte. */
function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}

const POINTS = 9;

/**
 * La vignette d'un rival : une petite planche noire avec sa cellule gravée. La silhouette et
 * les cils viennent de son identifiant ; la teinte est celle de la carte. Purement décoratif.
 */
export function RivalVignette({ hue, seed }: Props) {
  const base = hash(seed);
  const radii = Array.from({ length: POINTS }, (_, index) => {
    const wobble = ((base >>> (index * 3)) & 7) / 7;
    return 9.5 + wobble * 3.5;
  });
  const at = (index: number, scale: number): [number, number] => {
    const angle = (index / POINTS) * Math.PI * 2;
    const radius = (radii[index % POINTS] ?? 11) * scale;
    return [22 + Math.cos(angle) * radius, 22 + Math.sin(angle) * radius];
  };
  // Une courbe fermée et douce qui passe entre les points.
  const outline = (scale: number): string => {
    let path = "";
    for (let index = 0; index < POINTS; index++) {
      const [x, y] = at(index, scale);
      const [nx, ny] = at((index + 1) % POINTS, scale);
      const mx = (x + nx) / 2;
      const my = (y + ny) / 2;
      path += index === 0 ? `M${mx.toFixed(1)} ${my.toFixed(1)}` : "";
      const [ax, ay] = at((index + 1) % POINTS, scale);
      const [bx, by] = at((index + 2) % POINTS, scale);
      path += ` Q${ax.toFixed(1)} ${ay.toFixed(1)} ${((ax + bx) / 2).toFixed(1)} ${((ay + by) / 2).toFixed(1)}`;
    }
    return `${path} Z`;
  };
  const cilia = 3 + (base % 4);
  const tint = `hsl(${String(hue)} 55% 68%)`;
  const nucleusX = 22 + (((base >>> 8) & 7) - 3.5) * 0.7;
  const nucleusY = 22 + (((base >>> 12) & 7) - 3.5) * 0.7;
  return (
    <svg className="rival-vignette" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="21" className="rival-vignette-plate" />
      <circle cx="22" cy="22" r="18.5" className="rival-vignette-ring" />
      {Array.from({ length: cilia }, (_, index) => {
        const spot = (index * 2 + (base % POINTS)) % POINTS;
        const [x, y] = at(spot, 1);
        const [fx, fy] = at(spot, 1.32);
        return (
          <line
            key={index}
            x1={x.toFixed(1)}
            y1={y.toFixed(1)}
            x2={fx.toFixed(1)}
            y2={fy.toFixed(1)}
            stroke={tint}
            strokeWidth="1"
            strokeLinecap="round"
          />
        );
      })}
      <path d={outline(1)} fill={tint} fillOpacity="0.22" stroke={tint} strokeWidth="1.4" />
      <path d={outline(0.74)} fill="none" stroke={tint} strokeWidth="0.6" strokeDasharray="1 2" />
      <circle cx={nucleusX} cy={nucleusY} r="3.2" fill="none" stroke={tint} strokeWidth="1.1" />
      <circle cx={nucleusX} cy={nucleusY} r="1" fill={tint} />
    </svg>
  );
}
