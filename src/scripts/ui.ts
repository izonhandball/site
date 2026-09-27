// Interactions de l'interface, sans framework : onglets, carrousels, fenêtres, menu mobile.

function onglets() {
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
    if (tab) activer(tab);
  });

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
    if ((e.target as HTMLElement).closest("a")) basculer(false);
  });
}

onglets();
carrousels();
fenetres();
menu();
