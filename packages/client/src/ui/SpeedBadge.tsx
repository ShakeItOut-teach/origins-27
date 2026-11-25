import { useState } from "react";
import { SPEEDS } from "../game/speed";
import type { Speed } from "../game/speed";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly speed: Exclude<Speed, 1>;
  readonly lang: Lang;
}

/** Le rappel de l'essai accéléré, et de quoi changer de vitesse, recommencer ou en sortir. */
export function SpeedBadge({ speed, lang }: Props) {
  const [open, setOpen] = useState(false);
  const n = (text: string, value: number): string => text.replace("{n}", String(value));
  return (
    <div className="speed-badge" data-testid="speed-badge">
      <button
        type="button"
        className="speed-pill"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {n(translate(lang, "speed.title"), speed)}
      </button>
      {open && (
        <div className="speed-menu">
          <p>{n(translate(lang, "speed.note"), speed)}</p>
          {SPEEDS.filter((other) => other !== speed).map((other) => (
            <a key={other} className="speed-action" href={`?vitesse=${String(other)}`}>
              {n(translate(lang, "speed.switch"), other)}
            </a>
          ))}
          <a className="speed-action" href={`?vitesse=${String(speed)}&recommencer=1`}>
            {translate(lang, "speed.restart")}
          </a>
          <a className="speed-action" href="?vitesse=1">
            {translate(lang, "speed.leave")}
          </a>
        </div>
      )}
    </div>
  );
}
