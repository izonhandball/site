import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

const SITE = "https://hbcizon.fr";
const env = (surcharge: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: async () => new Response("asset") },
  GITHUB_CLIENT_ID: "id-client",
  GITHUB_CLIENT_SECRET: "secret-client",
  ...surcharge,
});

afterEach(() => vi.unstubAllGlobals());

describe("worker", () => {
  it("sert les fichiers statiques hors /api", async () => {
    const r = await worker.fetch(new Request(`${SITE}/histoire/`), env());
    expect(await r.text()).toBe("asset");
  });

  it("redirige vers GitHub avec un état mémorisé en cookie", async () => {
    const r = await worker.fetch(new Request(`${SITE}/api/auth?provider=github`), env());
    expect(r.status).toBe(302);
    const cible = new URL(r.headers.get("Location")!);
    expect(cible.origin + cible.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(cible.searchParams.get("client_id")).toBe("id-client");
    expect(cible.searchParams.get("redirect_uri")).toBe(`${SITE}/api/auth/callback`);
    expect(cible.searchParams.get("scope")).toBe("public_repo");
    const etat = cible.searchParams.get("state");
    expect(r.headers.get("Set-Cookie")).toContain(`decap_oauth_etat=${etat};`);
    expect(r.headers.get("Set-Cookie")).toContain("HttpOnly");
  });

  it("refuse un retour dont l'état ne correspond pas au cookie", async () => {
    const appelGithub = vi.fn();
    vi.stubGlobal("fetch", appelGithub);
    const r = await worker.fetch(
      new Request(`${SITE}/api/auth/callback?code=abc&state=pirate`, {
        headers: { Cookie: "decap_oauth_etat=legitime" },
      }),
      env(),
    );
    expect(await r.text()).toContain("authorization:github:error:");
    expect(appelGithub).not.toHaveBeenCalled();
  });

  it("échange le code et transmet le jeton au seul site d'origine", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ access_token: "gho_jeton</script>" })),
    );
    const r = await worker.fetch(
      new Request(`${SITE}/api/auth/callback?code=abc&state=e1`, {
        headers: { Cookie: "autre=1; decap_oauth_etat=e1" },
      }),
      env(),
    );
    const html = await r.text();
    expect(html).toContain("authorization:github:success:");
    expect(html).toContain('"https://hbcizon.fr"');
    expect(html).not.toContain('postMessage("authorizing:github", "*")');
    // Le jeton ne peut pas fermer la balise script.
    expect(html).not.toContain("gho_jeton</script>");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("signale une configuration OAuth manquante", async () => {
    const r = await worker.fetch(
      new Request(`${SITE}/api/auth`),
      env({ GITHUB_CLIENT_ID: undefined }),
    );
    expect(r.status).toBe(500);
  });
});
