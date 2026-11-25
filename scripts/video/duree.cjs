// Ajoute la durée (en millisecondes) dans l'en-tête d'un fichier WebM enregistré par le
// navigateur, qui n'en met pas : sans elle, beaucoup de lecteurs ne savent ni afficher la
// durée ni se déplacer dans la vidéo.

/** Lit un nombre à longueur variable (la taille d'un bloc). */
function size(bytes, at) {
  const first = bytes[at];
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && !(first & mask)) {
    mask >>= 1;
    length++;
  }
  let value = first & (mask - 1);
  for (let i = 1; i < length; i++) value = value * 256 + bytes[at + i];
  return { length, value, unknown: value === 2 ** (7 * length) - 1 };
}

/** Lit l'identifiant d'un bloc. */
function id(bytes, at) {
  const first = bytes[at];
  let length = 1;
  let mask = 0x80;
  while (length <= 4 && !(first & mask)) {
    mask >>= 1;
    length++;
  }
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + bytes[at + i];
  return { length, value };
}

const HEADER = 0x1a45dfa3;
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const DURATION = 0x4489;

/** Rend le fichier avec sa durée. S'il en a déjà une, ou s'il est d'une forme inattendue, il est rendu tel quel. */
function addDuration(bytes, milliseconds) {
  let at = 0;
  const header = id(bytes, at);
  if (header.value !== HEADER) return bytes;
  const headerSize = size(bytes, at + header.length);
  at += header.length + headerSize.length + headerSize.value;
  const segment = id(bytes, at);
  if (segment.value !== SEGMENT) return bytes;
  const segmentSize = size(bytes, at + segment.length);
  if (!segmentSize.unknown) return bytes;
  let block = at + segment.length + segmentSize.length;
  while (block < bytes.length) {
    const element = id(bytes, block);
    const elementSize = size(bytes, block + element.length);
    const data = block + element.length + elementSize.length;
    if (element.value === INFO) {
      const end = data + elementSize.value;
      for (let inner = data; inner < end;) {
        const child = id(bytes, inner);
        const childSize = size(bytes, inner + child.length);
        if (child.value === DURATION) return bytes;
        inner += child.length + childSize.length + childSize.value;
      }
      // Le bloc de durée : son identifiant, sa taille (8), puis le nombre.
      const duration = Buffer.alloc(11);
      duration.set([0x44, 0x89, 0x88]);
      duration.writeDoubleBE(milliseconds, 3);
      // La taille du bloc d'informations grandit de 11 : on la réécrit sur 8 octets.
      const grown = Buffer.alloc(8);
      grown[0] = 0x01;
      let rest = elementSize.value + 11;
      for (let i = 7; i >= 1; i--) {
        grown[i] = rest & 255;
        rest = Math.floor(rest / 256);
      }
      return Buffer.concat([
        bytes.subarray(0, block + element.length),
        grown,
        bytes.subarray(data, end),
        duration,
        bytes.subarray(end),
      ]);
    }
    if (elementSize.unknown) break;
    block = data + elementSize.value;
  }
  return bytes;
}

module.exports = { addDuration };
