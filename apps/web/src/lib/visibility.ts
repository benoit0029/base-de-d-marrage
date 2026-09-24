import { connection } from "next/server";
import type { ActivityNav } from "@/lib/nav";

type ActivitySlug = ActivityNav["slug"];
const SLUGS: ActivitySlug[] = ["maraichage", "fruits-legumes", "photobooth"];

// Activités masquées dans cette installation (variable HIDDEN_ACTIVITIES du
// fichier .env, ex. "maraichage,fruits-legumes" chez le partenaire qui n'a
// que Kerbooth). Vide = tout est affiché (installation de Benoît). Lue à
// chaque requête (connection) : un changement du .env suffit, sans
// reconstruire l'image, après redémarrage du conteneur.
export async function hiddenActivities(): Promise<ActivitySlug[]> {
  await connection();
  const raw = process.env.HIDDEN_ACTIVITIES ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ActivitySlug => SLUGS.includes(s as ActivitySlug));
}

export async function isActivityHidden(slug: ActivitySlug): Promise<boolean> {
  return (await hiddenActivities()).includes(slug);
}
