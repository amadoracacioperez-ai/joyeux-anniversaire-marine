import { h, son, vibrer } from './utils.js';
import { chargerLeaflet, nouvelleCarte, icone, tracer } from './revelation.js';

// Trois choix (transport, compagnon, destination), tous acceptés. Chaque choix ajoute
// un personnage à la scène, puis le voyage part de Paris : bon trio → révélation, sinon on recommence.
export function afficherVoyage(ecran, V, etat, { sauver, ouvrirModale, fermerModale, surReussite }) {
  const scene = h('div', { class: 'scene', 'aria-label': 'Ton voyage' });
  const zone = h('div', { class: 'voyage-zone' });
  ecran.append(
    h('section', { class: 'carte' },
      h('p', { class: 'surtitre' }, V.surtitre),
      h('h2', {}, V.titre),
      V.intro.map((t) => h('p', { class: 'consigne' }, t)),
      zone),
    scene);

  const choisie = (q) => q.options.find((o) => o.id === etat.choix[q.cle]);

  const majScene = (nouveau) => {
    const figures = [V.marine, ...V.questions.map(choisie).filter(Boolean)];
    scene.replaceChildren(...figures.map((f, k) => figure(f, k === figures.length - 1 && nouveau)));
  };

  const etape = (nouveau = false) => {
    majScene(nouveau);
    const q = V.questions.find((x) => !choisie(x));
    if (!q) {
      zone.replaceChildren(h('button', { class: 'bouton', type: 'button', onclick: partir }, V.bouton));
      return;
    }
    const n = V.questions.indexOf(q) + 1;
    zone.replaceChildren(
      h('p', { class: 'voyage-num' }, `Question ${n}/${V.questions.length}`),
      h('h3', { class: 'voyage-question' }, q.titre),
      h('div', { class: 'choix' }, q.options.map((o) => h('button', {
        class: 'choix-bouton', type: 'button',
        onclick: () => {
          son.clic();
          vibrer(30);
          etat.choix[q.cle] = o.id;
          sauver();
          etape(true);
        },
      }, visuel(o), h('span', {}, o.texte)))));
  };

  const partir = async () => {
    son.clic();
    const [transport, , destination] = V.questions.map(choisie);
    const conteneur = h('div', { class: 'carte-map voyage-map' });
    zone.replaceChildren(h('p', { class: 'voyage-num' }, V.enRoute), conteneur);
    conteneur.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      const L = await chargerLeaflet();
      const carte = nouvelleCarte(L, conteneur);
      const trajet = arc(V.depart, destination.pos);
      carte.fitBounds(L.latLngBounds(trajet), { padding: [30, 30] });
      L.marker(V.depart, { icon: icone(L, '🥐'), keyboard: false, interactive: false }).addTo(carte);
      L.marker(destination.pos, { icon: icone(L, destination.emoji), keyboard: false, interactive: false }).addTo(carte);
      const mobile = L.marker(V.depart, {
        icon: icone(L, transport.emoji, 'repere repere-velo'), zIndexOffset: 1000, keyboard: false, interactive: false,
      }).addTo(carte);
      await tracer(L, carte, mobile, trajet, { color: '#e4572e', weight: 5, opacity: 0.9, lineCap: 'round' }, 3200);
    } catch {
      await new Promise((ok) => setTimeout(ok, 1200));
    }
    arrivee();
  };

  const arrivee = () => {
    const bons = V.questions.filter((q) => choisie(q)?.correct).length;
    if (bons === V.questions.length) return surReussite();
    son.erreur();
    vibrer([50, 40, 50]);
    ouvrirModale(
      h('div', { class: 'grand-emoji', 'aria-hidden': 'true' }, '🙈'),
      h('p', { class: 'indice-grand' }, V.rate.titre),
      ...V.questions.map((q) => choisie(q).reaction).filter(Boolean).map((r) => h('p', { class: 'reaction' }, r)),
      h('p', {}, V.rate.texte.replace('{bons}', bons)),
      h('button', {
        class: 'bouton', type: 'button',
        onclick: () => {
          son.clic();
          fermerModale();
          etat.choix = {};
          sauver();
          etape();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      }, V.rate.bouton));
  };

  etape();
}

// Une photo ou un dessin si `image` est fourni, l'emoji sinon (ou si l'image ne charge pas).
function visuel(o) {
  const emoji = h('span', { class: 'visuel', 'aria-hidden': 'true' }, o.emoji);
  if (!o.image) return emoji;
  const img = h('img', { class: 'visuel visuel-img', src: o.image, alt: '' });
  img.addEventListener('error', () => img.replaceWith(emoji), { once: true });
  return img;
}

function figure(f, nouveau) {
  return h('div', { class: nouveau ? 'figure pop' : 'figure' }, visuel(f), h('small', {}, f.texte));
}

// Trajet légèrement courbé de a vers b.
function arc(a, b, n = 40) {
  const milieu = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.15, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.15];
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n;
    const u = 1 - t;
    return [0, 1].map((i) => u * u * a[i] + 2 * u * t * milieu[i] + t * t * b[i]);
  });
}
