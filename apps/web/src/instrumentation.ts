// Appelé une fois au démarrage du serveur Next.js (voir la doc
// "instrumentation") : lance les tâches de fond côté Node.js seulement.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
