// Gabarits d'aperçu de Decap CMS : reproduisent les blocs du site pendant la saisie.
// Données mises en forme et styles viennent des mêmes modules que le site
// (src/lib/equipes.ts, src/lib/histoire.ts, src/lib/icones.ts, src/styles/*.css) :
// seule la structure HTML est écrite une seconde fois ici. En cas de changement de
// structure dans un composant du site, reporter la modification dans ce fichier.

import { A_COMPLETER, libelleGroupe, lignesEquipe, type Equipe } from "../lib/equipes";
import { fondMaillot, hauteursLicencies } from "../lib/histoire";
import { ICONES, epaisseurIcone, type NomIcone } from "../lib/icones";

// --- API de Decap exposée sur window (React sous le capot) ---
type Noeud = unknown;
type H = (type: string, props?: Record<string, unknown> | null, ...enfants: unknown[]) => Noeud;
interface ImmutableMap {
  toJS(): Record<string, unknown>;
  get(cle: string): ImmutableMap | undefined;
}
interface PropsApercu {
  entry: ImmutableMap;
  widgetFor(champ: string): Noeud;
  getAsset(chemin: string): { toString(): string };
}
interface Decap {
  registerPreviewStyle(url: string): void;
  registerPreviewTemplate(nom: string, composant: unknown): void;
  init(options?: { config?: Record<string, unknown> }): void;
}
declare global {
  interface Window {
    CMS: Decap;
    h: H;
    createClass(spec: { render(this: { props: PropsApercu }): Noeud }): unknown;
  }
}

const h: H = (...args) => window.h(...args);
const donnees = <T>(props: PropsApercu) => (props.entry.get("data")?.toJS() ?? {}) as T;

const icone = (nom: NomIcone, taille: number) =>
  h("svg", {
    width: taille,
    height: taille,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: epaisseurIcone(nom),
    "aria-hidden": "true",
    dangerouslySetInnerHTML: { __html: ICONES[nom] },
  });

const visuel = (
  props: PropsApercu,
  src: string | undefined,
  alt: string,
  ratio: string,
  vide: string,
) =>
  src
    ? h("img", {
        src: props.getAsset(src).toString(),
        alt,
        // Fichier déclaré mais pas encore déposé : même emplacement réservé que sur le site.
        onError: (e: Event) => {
          const img = e.currentTarget as HTMLImageElement;
          const bloc = img.ownerDocument.createElement("div");
          bloc.className = "visuel-vide";
          bloc.style.aspectRatio = ratio;
          bloc.textContent = vide;
          img.replaceWith(bloc);
        },
      })
    : h("div", { className: "visuel-vide", style: { aspectRatio: ratio } }, h("span", null, vide));

const note = (texte: string) => h("p", { className: "apercu__note" }, texte);

function gabarit(rendu: (props: PropsApercu) => Noeud) {
  return window.createClass({
    render() {
      return rendu(this.props);
    },
  });
}

// --- Fiche équipe (components/Equipes.astro) ---
function ficheEquipe(props: PropsApercu, email: string) {
  const e = donnees<Equipe>(props);
  return h(
    "section",
    { className: "section section--alt apercu" },
    note("Aperçu de la fiche, telle qu'elle s'affiche dans « Équipes & entraînements »."),
    h(
      "div",
      { className: "fiche-equipe" },
      h(
        "figure",
        { className: "fiche-equipe__photo" },
        visuel(
          props,
          e.photo,
          `Photo de l'équipe ${e.nom ?? ""}`,
          "3 / 4",
          "Photo d'équipe à fournir",
        ),
        e.photo && e.photoLegende ? h("figcaption", { className: "script" }, e.photoLegende) : null,
      ),
      h(
        "div",
        { className: "fiche-equipe__texte" },
        h("p", { className: "fiche-equipe__groupe" }, libelleGroupe(e)),
        h("h3", { className: "fiche-equipe__nom" }, e.nom || "Nom de l'équipe"),
        h(
          "dl",
          null,
          ...lignesEquipe(e).map((l) =>
            h(
              "div",
              { key: l.label },
              h("dt", null, l.label),
              h("dd", { className: l.valeur ? undefined : "a-completer" }, l.valeur ?? A_COMPLETER),
            ),
          ),
        ),
        e.mention ? h("p", { className: "fiche-equipe__mention" }, e.mention) : null,
        h(
          "p",
          { className: "fiche-equipe__contact" },
          icone("mail", 20),
          "Renseignements : ",
          h("a", { href: `mailto:${email}` }, email),
        ),
      ),
    ),
  );
}

// --- Période de la frise (pages/histoire.astro) ---
interface Periode {
  periode?: string;
  titre?: string;
  presidents?: string[];
  archives?: { image: string; legende: string }[];
}

function periode(props: PropsApercu) {
  const p = donnees<Periode>(props);
  const presidents = p.presidents ?? [];
  const archives = p.archives ?? [];
  return h(
    "section",
    { className: "section apercu" },
    note("Aperçu du panneau de la période sur la page Histoire."),
    h(
      "div",
      { className: "periode" },
      h(
        "div",
        { className: "periode__texte" },
        h("p", { className: "script periode__dates" }, p.periode || "Période"),
        h("h2", { className: "periode__titre" }, p.titre || "Titre"),
        h("div", { className: "periode__faits" }, props.widgetFor("body")),
        h("p", { className: "periode__sous-titre" }, "Présidence"),
        ...(presidents.length
          ? presidents.map((pr) => h("p", { className: "periode__president", key: pr }, pr))
          : [h("p", { className: "periode__president a-completer" }, A_COMPLETER)]),
      ),
      h(
        "div",
        { className: "periode__archives" },
        archives.length
          ? h(
              "div",
              { className: "apercu__archives" },
              ...archives.map((a, i) =>
                h(
                  "figure",
                  { key: i },
                  visuel(props, a.image, a.legende, "3 / 4", "Archive à numériser"),
                  h("figcaption", null, a.legende),
                ),
              ),
            )
          : h("div", { className: "periode__vide" }, "Archives de cette période à numériser"),
      ),
    ),
  );
}

// --- Réglages du club : accroche Histoire et pied de page ---
interface Club {
  nom?: string;
  fondation?: number;
  devise?: string;
  email?: string;
  salle?: { nom?: string; adresse?: string };
  liens?: Record<string, string>;
  accrocheHistoire?: string;
}

function club(props: PropsApercu) {
  const c = donnees<Club>(props);
  const ans = c.fondation ? new Date().getFullYear() - c.fondation : "";
  const lien = (cle: string, texte: string) =>
    h("p", null, h("a", { href: c.liens?.[cle] }, texte));
  return h(
    "div",
    null,
    h(
      "section",
      { className: "accroche" },
      h(
        "div",
        { className: "accroche__inner" },
        h(
          "div",
          null,
          h("p", { className: "accroche__depuis" }, `Since ${c.fondation ?? ""}`),
          h("h2", { className: "titre-affiche" }, `${ans} ans d'histoire`),
          h("p", { className: "accroche__texte" }, c.accrocheHistoire),
          h("span", { className: "btn accroche__lien" }, "Découvrir l'histoire du club →"),
        ),
      ),
    ),
    h(
      "footer",
      { className: "pied" },
      h(
        "div",
        { className: "pied__inner" },
        h("div", { className: "pied__marque" }, h("p", { className: "script" }, c.devise)),
        h(
          "div",
          { className: "pied__colonnes" },
          h(
            "div",
            null,
            h("h2", null, "La salle"),
            h("p", null, c.salle?.nom, h("br"), c.salle?.adresse),
          ),
          h(
            "div",
            null,
            h("h2", null, "Contact"),
            h("p", null, h("a", { href: `mailto:${c.email}` }, c.email)),
            lien("ffhandball", "Fiche FFHandball"),
          ),
          h(
            "div",
            null,
            h("h2", null, "Suivre"),
            lien("instagram", "Instagram"),
            lien("facebook", "Facebook"),
            lien("scorenco", "Résultats & classements"),
            lien("helloasso", "HelloAsso"),
            lien("boutique", "Boutique"),
          ),
        ),
      ),
    ),
  );
}

// --- Réglages de l'histoire : licenciés et maillots ---
interface ChiffresHistoire {
  licencies?: { saison: string; nombre: number }[];
  maillots?: { nom: string; couleurs?: string[] }[];
  citationMaillots?: string;
}

function chiffresHistoire(props: PropsApercu) {
  const d = donnees<ChiffresHistoire>(props);
  const licencies = d.licencies ?? [];
  const hauteurs = hauteursLicencies(licencies.map((l) => Number(l.nombre) || 0));
  return h(
    "div",
    null,
    h(
      "section",
      { className: "section section--alt" },
      h("h2", { className: "titre-affiche" }, "Licenciés par saison"),
      h(
        "div",
        { className: "barres" },
        ...licencies.map((l, i) =>
          h(
            "span",
            { className: "barre", key: i },
            h("span", { className: "barre__nombre" }, l.nombre),
            h("span", { className: "barre__trait", style: { height: `${hauteurs[i]}%` } }),
            h("span", { className: "barre__saison" }, l.saison),
          ),
        ),
      ),
    ),
    h(
      "section",
      { className: "section" },
      h("h2", { className: "titre-affiche" }, "Les maillots"),
      h(
        "div",
        { className: "maillots" },
        ...(d.maillots ?? []).map((m, i) =>
          h(
            "div",
            { key: i },
            h("div", {
              className: "maillots__couleur",
              style: { background: fondMaillot(m.couleurs ?? []) },
            }),
            h("p", null, m.nom),
          ),
        ),
      ),
      d.citationMaillots ? h("p", { className: "sous-titre" }, d.citationMaillots) : null,
    ),
  );
}

/** Enregistre les gabarits ; `feuille` est l'URL de src/styles/apercu.css après build. */
export function enregistrerApercus(feuille: string, email: string) {
  const { CMS } = window;
  CMS.registerPreviewStyle(feuille);
  CMS.registerPreviewTemplate(
    "equipes",
    gabarit((p) => ficheEquipe(p, email)),
  );
  CMS.registerPreviewTemplate("periodes", gabarit(periode));
  CMS.registerPreviewTemplate("club", gabarit(club));
  CMS.registerPreviewTemplate("histoire", gabarit(chiffresHistoire));
}
