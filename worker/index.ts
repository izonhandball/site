// Worker Cloudflare : sert le site statique (dist/) et l'authentification GitHub de Decap CMS.
//   /api/auth           → redirige vers GitHub (OAuth App de l'organisation izonhandball)
//   /api/auth/callback  → échange le code contre un jeton et le transmet à /admin par postMessage
// Secrets du Worker : GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (wrangler secret put).

export interface Env {
  ASSETS: { fetch(requete: Request): Promise<Response> };
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

// Dépôt public : public_repo suffit pour lire et écrire le contenu.
const SCOPE = "public_repo";
const COOKIE_ETAT = "decap_oauth_etat";

export default {
  async fetch(requete: Request, env: Env): Promise<Response> {
    const url = new URL(requete.url);
    if (url.pathname === "/api/auth") return debut(url, env);
    if (url.pathname === "/api/auth/callback") return retour(requete, url, env);
    if (url.pathname.startsWith("/api/")) return new Response("Introuvable", { status: 404 });
    return env.ASSETS.fetch(requete);
  },
};

function debut(url: URL, env: Env): Response {
  if (!env.GITHUB_CLIENT_ID) return new Response("OAuth non configuré", { status: 500 });
  const etat = crypto.randomUUID();
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  github.searchParams.set("redirect_uri", `${url.origin}/api/auth/callback`);
  github.searchParams.set("scope", SCOPE);
  github.searchParams.set("state", etat);
  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      "Set-Cookie": `${COOKIE_ETAT}=${etat}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function retour(requete: Request, url: URL, env: Env): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("OAuth non configuré", { status: 500 });
  }
  const etat = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!etat || !code || etat !== lireCookie(requete, COOKIE_ETAT)) {
    return pageDeRetour(url.origin, "error", { message: "Requête d'authentification invalide." });
  }

  const reponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  const corps = (await reponse.json()) as { access_token?: string; error_description?: string };
  if (!corps.access_token) {
    return pageDeRetour(url.origin, "error", {
      message: corps.error_description ?? "GitHub a refusé l'authentification.",
    });
  }
  return pageDeRetour(url.origin, "success", { token: corps.access_token, provider: "github" });
}

function lireCookie(requete: Request, nom: string): string | null {
  const cookies = requete.headers.get("Cookie") ?? "";
  for (const morceau of cookies.split(";")) {
    const [cle, ...valeur] = morceau.trim().split("=");
    if (cle === nom) return valeur.join("=");
  }
  return null;
}

/**
 * Page affichée dans la fenêtre de connexion : protocole de Decap
 * (« authorizing:github », puis « authorization:github:<statut>:<json> »),
 * limité à l'origine du site pour que le jeton ne parte jamais ailleurs.
 */
function pageDeRetour(origine: string, statut: "success" | "error", contenu: object): Response {
  const message = `authorization:github:${statut}:${JSON.stringify(contenu)}`;
  // Échappe « < » pour qu'aucune valeur ne puisse fermer la balise <script>.
  const js = (v: string) => JSON.stringify(v).replace(/</g, "\\u003c");
  const html = `<!doctype html><meta charset="utf-8"><title>Connexion</title>
<script>
  (function () {
    var origine = ${js(origine)};
    window.addEventListener("message", function (e) {
      if (e.origin !== origine) return;
      window.opener.postMessage(${js(message)}, origine);
    }, false);
    window.opener.postMessage("authorizing:github", origine);
  })();
</script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": `${COOKIE_ETAT}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}
