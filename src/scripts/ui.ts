// Interactions de l'interface, sans framework : onglets, carrousels, fenêtres, menu mobile,
// formulaire de contact.

function onglets() {
  // Même seuil que Equipes.astro et fiche-equipe.css (1099.98px).
  const mobile = window.matchMedia("(max-width: 1099.98px)");
  const activer = (tab: HTMLElement) => {
    const groupe = tab.closest<HTMLElement>("[data-onglets]");
    if (!groupe) return;
    for (const autre of groupe.querySelectorAll<HTMLElement>('[role="tab"]')) {
      const actif = autre === tab;
      autre.setAttribute("aria-selected", String(actif));
      autre.tabIndex = actif ? 0 : -1;
      const panneau = document.getElementById(autre.getAttribute("aria-controls") ?? "");
      if (panneau) panneau.hidden = !actif;
    }
    groupe.dispatchEvent(new CustomEvent("onglet", { detail: tab.getAttribute("aria-controls") }));
  };

  document.addEventListener("click", (e) => {
    const cible = (e.target as HTMLElement).closest<HTMLElement>(
      '[role="tab"], [data-vers-onglet]',
    );
    if (!cible) return;
    const tab = cible.matches('[role="tab"]')
      ? cible
      : document.querySelector<HTMLElement>(
          `[role="tab"][aria-controls="${cible.dataset.versOnglet}"]`,
        );
    if (!tab) return;
    // Accordéon (mobile) : toucher la ligne ouverte la referme.
    const accordeon = tab.closest("[data-accordeon-mobile]") && mobile.matches;
    if (accordeon && tab.getAttribute("aria-selected") === "true") return replier(tab);
    activer(tab);
    // La fiche précédente, au-dessus, vient de se fermer : garder la ligne touchée à l'écran.
    if (accordeon && tab.getBoundingClientRect().top < 84) tab.scrollIntoView({ block: "start" });
  });

  // Sur mobile, la liste des équipes s'affiche repliée ; sur desktop, un onglet est toujours ouvert.
  const replier = (tab: HTMLElement) => {
    tab.setAttribute("aria-selected", "false");
    const panneau = document.getElementById(tab.getAttribute("aria-controls") ?? "");
    if (panneau) panneau.hidden = true;
  };
  const adapter = () => {
    for (const groupe of document.querySelectorAll<HTMLElement>("[data-accordeon-mobile]")) {
      const tabs = [...groupe.querySelectorAll<HTMLElement>('[role="tab"]')];
      if (mobile.matches) tabs.forEach(replier);
      else if (!tabs.some((t) => t.getAttribute("aria-selected") === "true") && tabs[0])
        activer(tabs[0]);
    }
  };
  adapter();
  mobile.addEventListener("change", adapter);

  // Navigation au clavier entre onglets (flèches gauche / droite).
  document.addEventListener("keydown", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const liste = [
      ...(tab.closest("[data-onglets]")?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []),
    ];
    const i = liste.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
    const suivant = liste[(i + liste.length) % liste.length];
    if (suivant) {
      activer(suivant);
      suivant.focus();
    }
  });
}

function carrousels() {
  for (const racine of document.querySelectorAll<HTMLElement>("[data-carrousel]")) {
    const piste = racine.querySelector<HTMLElement>("[data-piste]")!;
    const prec = racine.querySelector<HTMLButtonElement>("[data-precedent]")!;
    const suiv = racine.querySelector<HTMLButtonElement>("[data-suivant]")!;
    const compteur = racine.querySelector<HTMLElement>("[data-compteur]")!;
    const diapos = () => [...piste.children] as HTMLElement[];
    const pas = () => {
      const [a, b] = diapos();
      return a && b ? b.offsetLeft - a.offsetLeft : piste.clientWidth;
    };

    const maj = () => {
      // Carrousel masqué (onglet inactif, fenêtre fermée) : le ResizeObserver relancera le calcul.
      if (piste.clientWidth === 0) return;
      const n = diapos().length;
      const p = pas();
      const visibles = Math.max(1, Math.round((piste.clientWidth + 1) / p));
      const premier = Math.min(n - 1, Math.round(piste.scrollLeft / p));
      const dernier = Math.min(n, premier + visibles);
      racine.toggleAttribute("data-seul", n <= visibles);
      compteur.textContent =
        visibles > 1 ? `${premier + 1}–${dernier} / ${n}` : `${premier + 1} / ${n}`;
      prec.disabled = piste.scrollLeft <= 2;
      suiv.disabled = piste.scrollLeft + piste.clientWidth >= piste.scrollWidth - 2;
      racine.dispatchEvent(new CustomEvent("diapo", { detail: premier }));
    };

    prec.addEventListener("click", () => piste.scrollBy({ left: -pas(), behavior: "smooth" }));
    suiv.addEventListener("click", () => piste.scrollBy({ left: pas(), behavior: "smooth" }));
    piste.addEventListener("scroll", () => requestAnimationFrame(maj), { passive: true });
    new ResizeObserver(maj).observe(piste);

    // Vignettes éventuelles : [data-aller="index"].
    racine.addEventListener("click", (e) => {
      const v = (e.target as HTMLElement).closest<HTMLElement>("[data-aller]");
      if (v) piste.scrollTo({ left: Number(v.dataset.aller) * pas(), behavior: "smooth" });
    });
    racine.addEventListener("diapo", (e) => {
      const i = (e as CustomEvent<number>).detail;
      for (const v of racine.querySelectorAll<HTMLElement>("[data-aller]")) {
        v.setAttribute("aria-current", String(Number(v.dataset.aller) === i));
      }
    });
    maj();
  }
}

function fenetres() {
  document.addEventListener("click", (e) => {
    const el = e.target as HTMLElement;
    const ouvrir = el.closest<HTMLElement>("[data-ouvrir]");
    if (ouvrir) {
      const dlg = document.getElementById(ouvrir.dataset.ouvrir!) as HTMLDialogElement | null;
      if (!dlg) return;
      ouvrir.closest("dialog")?.close();
      dlg.showModal();
      dlg.querySelector<HTMLElement>("[data-piste]")?.scrollTo({ left: 0 });
      return;
    }
    if (el.closest("[data-fermer]")) el.closest("dialog")?.close();
    // Clic sur le fond de la fenêtre.
    if (el instanceof HTMLDialogElement) el.close();
  });
}

function menu() {
  const bouton = document.querySelector<HTMLButtonElement>("[data-menu-bouton]");
  const nav = document.getElementById(bouton?.getAttribute("aria-controls") ?? "");
  if (!bouton || !nav) return;
  const basculer = (ouvert: boolean) => {
    bouton.setAttribute("aria-expanded", String(ouvert));
    nav.toggleAttribute("data-ouvert", ouvert);
  };
  bouton.addEventListener("click", () => basculer(bouton.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a, [data-ouvrir]")) basculer(false);
  });
}

// Turnstile (anti-robot de Cloudflare), chargé à la première ouverture du formulaire.
interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  getResponse(id: string): string | undefined;
  reset(id: string): void;
}
// Clé de test de Cloudflare : jeton toujours valide, accepté seulement par la clé secrète de test.
const CLE_TURNSTILE_TEST = "1x00000000000000000000AA";
const fenetre = window as Window & { turnstile?: Turnstile; turnstilePret?: () => void };

function contact() {
  const form = document.querySelector<HTMLFormElement>("[data-contact]");
  const dlg = form?.closest("dialog");
  if (!form || !dlg) return;
  const erreur = dlg.querySelector<HTMLElement>("[data-contact-erreur]")!;
  const envoyer = dlg.querySelector<HTMLButtonElement>("[data-contact-envoyer]")!;
  const merci = dlg.querySelector<HTMLElement>("[data-contact-merci]")!;
  const email = dlg.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.textContent ?? "";

  const zoneTurnstile = form.querySelector<HTMLElement>("[data-turnstile]")!;
  let widget: string | undefined;
  const chargerTurnstile = () => {
    if (document.getElementById("script-turnstile")) return;
    fenetre.turnstilePret = () => {
      widget = fenetre.turnstile!.render(zoneTurnstile, {
        sitekey: ["localhost", "127.0.0.1"].includes(location.hostname)
          ? CLE_TURNSTILE_TEST
          : zoneTurnstile.dataset.turnstile,
        "response-field-name": "turnstile",
        appearance: "interaction-only",
        theme: "dark",
        language: "fr",
      });
    };
    const script = document.createElement("script");
    script.id = "script-turnstile";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=turnstilePret";
    script.async = true;
    document.head.append(script);
  };
  document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(`[data-ouvrir="${dlg.id}"]`)) chargerTurnstile();
  });

  const signaler = (message: string) => {
    erreur.textContent = message;
    erreur.hidden = false;
  };

  // Champ « Équipe » affiché seulement pour un essai ou une inscription.
  form.addEventListener("change", (e) => {
    const champ = e.target as HTMLInputElement;
    if (champ.name === "sujet") {
      for (const bloc of form.querySelectorAll<HTMLElement>("[data-si-sujet]")) {
        bloc.hidden = !bloc.dataset.siSujet!.split(" ").includes(champ.value);
      }
    }
    if (champ.checkValidity()) {
      for (const c of form.querySelectorAll(`[name="${champ.name}"]`)) {
        c.removeAttribute("aria-invalid");
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erreur.hidden = true;
    const invalides = [...form.elements].filter(
      (c) =>
        (c instanceof HTMLInputElement || c instanceof HTMLTextAreaElement) && !c.checkValidity(),
    ) as HTMLInputElement[];
    for (const c of form.querySelectorAll("[aria-invalid]")) c.removeAttribute("aria-invalid");
    for (const c of invalides) c.setAttribute("aria-invalid", "true");
    if (invalides.length) {
      const premier = invalides[0]!;
      signaler(
        invalides.length === 1 && premier.type === "email" && premier.value
          ? "L'adresse e-mail n'est pas valide."
          : "Complétez les champs encadrés en rouge.",
      );
      premier.focus();
      return;
    }

    if (!widget || !fenetre.turnstile?.getResponse(widget)) {
      signaler("Vérification anti-robot en cours. Réessayez dans quelques secondes.");
      return;
    }

    envoyer.disabled = true;
    envoyer.setAttribute("aria-busy", "true");
    envoyer.textContent = "Envoi…";
    try {
      const donnees = Object.fromEntries(new FormData(form));
      const reponse = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      if (!reponse.ok) throw new Error(String(reponse.status));
      dlg.querySelector("[data-contact-adresse]")!.textContent = String(donnees.email);
      form.hidden = true;
      merci.hidden = false;
      merci.focus();
    } catch {
      signaler(`L'envoi a échoué. Réessayez dans un instant, ou écrivez directement à ${email}.`);
    } finally {
      // Un jeton Turnstile ne sert qu'une fois : on en redemande un pour l'envoi suivant.
      if (widget) fenetre.turnstile?.reset(widget);
      envoyer.disabled = false;
      envoyer.removeAttribute("aria-busy");
      envoyer.textContent = "Envoyer";
    }
  });

  // Après un envoi réussi, la fenêtre se rouvre sur un formulaire vierge.
  dlg.addEventListener("close", () => {
    if (merci.hidden) return;
    form.reset();
    for (const bloc of form.querySelectorAll<HTMLElement>("[data-si-sujet]")) bloc.hidden = true;
    form.hidden = false;
    merci.hidden = true;
  });
}

onglets();
carrousels();
fenetres();
menu();
contact();
