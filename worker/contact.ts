// Formulaire de contact du site : POST /api/contact (JSON).
// Vérifie le formulaire et le jeton Turnstile, puis envoie le message à la boîte du club
// par Email Routing (liaison CONTACT, destinataire fixé dans wrangler.jsonc).
// Le visiteur n'est jamais destinataire : son adresse sert seulement de « Répondre à ».

export interface EnvContact {
  CONTACT?: { send(message: MessageMail): Promise<{ messageId: string }> };
  TURNSTILE_SECRET?: string;
}

export interface MessageMail {
  from: { email: string; name: string };
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export const DESTINATAIRE = "izonhandball@gmail.com";
const EXPEDITEUR = { email: "formulaire@hbc-izon.fr", name: "Site HBC Izon" };
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const SUJETS: Record<string, string> = {
  essai: "Venir essayer",
  inscription: "Inscription",
  partenariat: "Partenariat",
  autre: "Autre question",
};
const LONGUEURS = { nom: 100, email: 200, telephone: 30, equipe: 60, message: 3000 };
const LIENS_MAX = 3;

interface Formulaire {
  sujet: string;
  equipe: string;
  nom: string;
  email: string;
  telephone: string;
  message: string;
}

export async function contact(requete: Request, env: EnvContact): Promise<Response> {
  if (requete.method !== "POST") return reponse(405, "Méthode non autorisée.");
  if (!env.CONTACT || !env.TURNSTILE_SECRET) return reponse(500, "Formulaire non configuré.");

  const url = new URL(requete.url);
  const origine = requete.headers.get("Origin");
  if (origine && origine !== url.origin) return reponse(403, "Origine refusée.");

  let donnees: Record<string, unknown>;
  try {
    donnees = (await requete.json()) as Record<string, unknown>;
  } catch {
    return reponse(400, "Requête illisible.");
  }
  // Champ piège rempli : c'est un robot. On répond « envoyé » sans rien envoyer.
  if (texte(donnees.site)) return reponse(200);

  const lu = lireFormulaire(donnees);
  if (typeof lu === "string") return reponse(400, lu);

  const humain = await verifierTurnstile(
    texte(donnees.turnstile),
    env.TURNSTILE_SECRET,
    url.hostname,
    requete.headers.get("CF-Connecting-IP"),
  );
  if (!humain) return reponse(403, "Vérification anti-robot échouée.");

  try {
    await env.CONTACT.send(composerMail(lu));
  } catch (e) {
    console.error("Envoi du formulaire de contact impossible", e);
    return reponse(502, "L'envoi a échoué.");
  }
  return reponse(200);
}

/** Formulaire nettoyé, ou message d'erreur. */
export function lireFormulaire(d: Record<string, unknown>): Formulaire | string {
  const f: Formulaire = {
    sujet: texte(d.sujet),
    equipe: uneLigne(d.equipe),
    nom: uneLigne(d.nom),
    email: uneLigne(d.email),
    telephone: uneLigne(d.telephone),
    message: texte(d.message),
  };
  if (!SUJETS[f.sujet]) return "Objet du message invalide.";
  if (!f.nom || !f.email || !f.message) return "Nom, e-mail et message sont obligatoires.";
  for (const [champ, max] of Object.entries(LONGUEURS)) {
    if (f[champ as keyof typeof LONGUEURS].length > max) return `Champ ${champ} trop long.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "Adresse e-mail invalide.";
  if ((f.message.match(/https?:\/\/|www\./gi) ?? []).length > LIENS_MAX) {
    return "Trop de liens dans le message.";
  }
  return f;
}

export function composerMail(f: Formulaire): MessageMail {
  const sujet = SUJETS[f.sujet]!;
  const lignes = [
    "Nouveau message envoyé depuis le formulaire de contact du site.",
    "",
    `Objet : ${sujet}`,
    ...(f.equipe ? [`Équipe : ${f.equipe}`] : []),
    `Nom : ${f.nom}`,
    `E-mail : ${f.email}`,
    ...(f.telephone ? [`Téléphone : ${f.telephone}`] : []),
    "",
    "Message :",
    f.message,
    "",
    "--",
    `« Répondre » écrit directement à ${f.email}.`,
  ];
  return {
    from: EXPEDITEUR,
    to: DESTINATAIRE,
    replyTo: f.email,
    subject: `[Site] ${sujet}${f.equipe ? ` (${f.equipe})` : ""} : ${f.nom}`,
    text: lignes.join("\n"),
  };
}

async function verifierTurnstile(
  jeton: string,
  secret: string,
  hote: string,
  ip: string | null,
): Promise<boolean> {
  if (!jeton) return false;
  const corps = new FormData();
  corps.set("secret", secret);
  corps.set("response", jeton);
  if (ip) corps.set("remoteip", ip);
  try {
    const r = await fetch(SITEVERIFY, { method: "POST", body: corps });
    const res = (await r.json()) as {
      success?: boolean;
      hostname?: string;
      metadata?: { result_with_testing_key?: boolean };
    };
    // Les clés de test (wrangler dev) répondent « example.com » ; la vraie clé secrète
    // refuse leurs jetons, donc ce cas n'existe pas en production.
    const hoteValide = res.hostname === hote || res.metadata?.result_with_testing_key === true;
    return res.success === true && hoteValide;
  } catch {
    return false;
  }
}

const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
// Champs d'une ligne : aucun retour à la ligne ne doit atteindre l'objet du mail.
const uneLigne = (v: unknown) => texte(v).replace(/[\r\n\t]+/g, " ");

const reponse = (statut: number, erreur?: string) =>
  Response.json(erreur ? { erreur } : { ok: true }, {
    status: statut,
    headers: { "Cache-Control": "no-store" },
  });
