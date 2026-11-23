/**
 * Où se trouve le serveur. La clé est publique par nature : elle n'ouvre rien sans le jeton
 * du joueur, et les règles d'accès de la base font le reste.
 * En développement et dans les tests, le jeu tourne sans serveur, sauf si VITE_SERVER=on.
 */
const useServer = import.meta.env.PROD || import.meta.env.VITE_SERVER === "on";

export const SERVER: { readonly url: string; readonly key: string } | null = useServer
  ? {
      url: "https://dzotlvwbmjiqyfiymmlz.supabase.co",
      key: "sb_publishable_x1OgN1cjsjly9r_ZWTsSKA_krpNYvkC",
    }
  : null;
