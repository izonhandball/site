import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";
import type { MessageMail } from "./contact";

const SITE = "https://hbc-izon.fr";
const FORMULAIRE = {
  sujet: "essai",
  equipe: "U15 G",
  nom: "Camille Durand",
  email: "camille@example.org",
  telephone: "",
  message: "Bonjour, mon fils aimerait essayer.",
  site: "",
  turnstile: "jeton-turnstile",
};

function preparer(verification: object = { success: true, hostname: "hbc-izon.fr" }) {
  const envoyes: MessageMail[] = [];
  const siteverify = vi.fn(async () => Response.json(verification));
  vi.stubGlobal("fetch", siteverify);
  const env: Env = {
    ASSETS: { fetch: async () => new Response("asset") },
    TURNSTILE_SECRET: "secret-turnstile",
    CONTACT: {
      send: async (m) => {
        envoyes.push(m);
        return { messageId: "1" };
      },
    },
  };
  return { env, envoyes, siteverify };
}

const envoyer = (env: Env, corps: object, entetes: Record<string, string> = {}) =>
  worker.fetch(
    new Request(`${SITE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: SITE, ...entetes },
      body: JSON.stringify(corps),
    }),
    env,
  );

afterEach(() => vi.unstubAllGlobals());

describe("formulaire de contact", () => {
  it("envoie le message au club, avec le visiteur en adresse de réponse", async () => {
    const { env, envoyes, siteverify } = preparer();
    const r = await envoyer(env, FORMULAIRE, { "CF-Connecting-IP": "203.0.113.7" });
    expect(r.status).toBe(200);
    expect(envoyes).toHaveLength(1);
    const mail = envoyes[0]!;
    expect(mail.to).toBe("izonhandball@gmail.com");
    expect(mail.from.email).toBe("formulaire@hbc-izon.fr");
    expect(mail.replyTo).toBe("camille@example.org");
    expect(mail.subject).toBe("[Site] Venir essayer (U15 G) : Camille Durand");
    expect(mail.text).toContain("Bonjour, mon fils aimerait essayer.");
    expect(mail.text).not.toContain("Téléphone");
    const corps = (siteverify.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as FormData;
    expect(corps.get("secret")).toBe("secret-turnstile");
    expect(corps.get("response")).toBe("jeton-turnstile");
    expect(corps.get("remoteip")).toBe("203.0.113.7");
  });

  it("n'envoie rien quand Turnstile refuse le jeton", async () => {
    const { env, envoyes } = preparer({ success: false });
    const r = await envoyer(env, FORMULAIRE);
    expect(r.status).toBe(403);
    expect(envoyes).toHaveLength(0);
  });

  it("refuse un jeton Turnstile obtenu sur un autre site", async () => {
    const { env, envoyes } = preparer({ success: true, hostname: "pirate.example" });
    expect((await envoyer(env, FORMULAIRE)).status).toBe(403);
    expect(envoyes).toHaveLength(0);
  });

  it("refuse un formulaire sans jeton Turnstile, sans appeler Cloudflare", async () => {
    const { env, envoyes, siteverify } = preparer();
    expect((await envoyer(env, { ...FORMULAIRE, turnstile: "" })).status).toBe(403);
    expect(siteverify).not.toHaveBeenCalled();
    expect(envoyes).toHaveLength(0);
  });

  it("fait croire à un envoi quand le champ piège est rempli", async () => {
    const { env, envoyes, siteverify } = preparer();
    const r = await envoyer(env, { ...FORMULAIRE, site: "http://spam.example" });
    expect(r.status).toBe(200);
    expect(envoyes).toHaveLength(0);
    expect(siteverify).not.toHaveBeenCalled();
  });

  it.each([
    ["un objet inconnu", { sujet: "pub" }],
    ["un e-mail invalide", { email: "pas-une-adresse" }],
    ["un message vide", { message: "  " }],
    ["un message trop long", { message: "a".repeat(3001) }],
    ["trop de liens", { message: "http://a.fr http://b.fr www.c.fr https://d.fr" }],
  ])("refuse %s", async (_, champ) => {
    const { env, envoyes } = preparer();
    expect((await envoyer(env, { ...FORMULAIRE, ...champ })).status).toBe(400);
    expect(envoyes).toHaveLength(0);
  });

  it("garde l'objet du mail sur une seule ligne", async () => {
    const { env, envoyes } = preparer();
    await envoyer(env, { ...FORMULAIRE, nom: "Camille\r\nBcc: autre@example.org" });
    expect(envoyes[0]!.subject).not.toMatch(/[\r\n]/);
  });

  it("refuse une requête venant d'un autre site", async () => {
    const { env, envoyes } = preparer();
    const r = await envoyer(env, FORMULAIRE, { Origin: "https://pirate.example" });
    expect(r.status).toBe(403);
    expect(envoyes).toHaveLength(0);
  });

  it("signale un échec d'envoi", async () => {
    const { env } = preparer();
    env.CONTACT = {
      send: async () => {
        throw new Error("E_SENDER_NOT_VERIFIED");
      },
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await envoyer(env, FORMULAIRE)).status).toBe(502);
  });

  it("n'accepte que POST et signale une configuration manquante", async () => {
    const { env } = preparer();
    const get = await worker.fetch(new Request(`${SITE}/api/contact`), env);
    expect(get.status).toBe(405);
    const r = await envoyer({ ...env, TURNSTILE_SECRET: undefined }, FORMULAIRE);
    expect(r.status).toBe(500);
  });
});
