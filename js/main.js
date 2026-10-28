import B64 from './contenu.js';
import { h, typo, decoder, svgCadenas, son, vibrer, confettis, aleatoire } from './utils.js';
import * as question from './enigmes/question.js';
import { afficherRevelation } from './revelation.js';
import { afficherVoyage } from './voyage.js';

const C = decoder(B64);
const ENIGMES = { question };
const NB = C.cadenas.length;

// Écrans : 0 = accueil, 1..NB = cadenas, VOYAGE = les trois choix, REVELATION = le cadeau.
const VOYAGE = NB + 1;
const REVELATION = NB + 2;

const CLE = 'cadeau-mystere-v2';
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const DUREE_BLOCAGE = 2 * 60 * 60 * 1000; // 2 heures

const etatInitial = () => ({
  ecran: 0, aides: Array(NB).fill(0), erreurs: 0, choix: {}, debut: null, fin: null,
  porteOk: false, bloqueeJusqu: null,
});

if (params.has('reset')) {
  try { localStorage.removeItem(CLE); } catch {}
  params.delete('reset');
  const reste = params.toString();
  history.replaceState(null, '', location.pathname + (reste ? `?${reste}` : ''));
}

let etat = charger();
let decompteId = null;

function charger() {
  try {
    const sauve = JSON.parse(localStorage.getItem(CLE));
    // Les parties déjà commencées avant l'ajout de la porte n'ont pas à la repasser.
    if (sauve && Number.isInteger(sauve.ecran)) {
      return { ...etatInitial(), ...sauve, porteOk: sauve.porteOk ?? sauve.ecran > 0 };
    }
  } catch {}
  return etatInitial();
}

function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch {}
}

const ecranEl = document.getElementById('ecran');
const carnetEl = document.getElementById('carnet');
const modaleEl = document.getElementById('modale');
const rangee = document.getElementById('rangee-cadenas');
const boutonSon = document.getElementById('bouton-son');

rangee.style.setProperty('--n', NB);
rangee.append(...C.cadenas.map((_, i) => h('li', { 'aria-label': `Cadenas ${i + 1}` }, svgCadenas())));

function afficher() {
  fermerModale();
  arreterDecompte();
  if (!etat.porteOk) {
    rangee.hidden = true;
    ecranEl.replaceChildren();
    window.scrollTo(0, 0);
    if (etat.bloqueeJusqu && Date.now() >= etat.bloqueeJusqu) {
      etat.bloqueeJusqu = null;
      sauver();
    }
    if (etat.bloqueeJusqu) bloque();
    else porte();
    return;
  }
  rangee.hidden = false;
  const ouverts = Math.min(NB, Math.max(0, etat.ecran - 1));
  [...rangee.children].forEach((li, i) => {
    li.classList.toggle('ouvert', i < ouverts);
    li.classList.toggle('actuel', i === etat.ecran - 1);
  });
  majCarnet(ouverts);
  ecranEl.replaceChildren();
  window.scrollTo(0, 0);
  if (etat.ecran === 0) accueil();
  else if (etat.ecran <= NB) cadenas(etat.ecran - 1);
  else if (etat.ecran === VOYAGE) voyage();
  else afficherRevelation(ecranEl, C.revelation, etat, recommencer);
}

// Porte d'entrée : une question de maths façon « Qui veut gagner des millions »,
// à réussir avant même l'accueil. Un échec verrouille le jeu pendant deux heures.
function porte() {
  const P = C.porte;
  const retour = h('p', { class: 'retour', role: 'status', 'aria-live': 'polite' });
  const boutons = P.options.map((option, k) => {
    const bouton = h('button', { class: 'option', type: 'button' },
      h('span', { class: 'option-lettre' }, `${String.fromCharCode(65 + k)} :`), option.texte);
    bouton.addEventListener('click', () => {
      son.activer();
      boutons.forEach((b) => { b.disabled = true; });
      if (option.correct) {
        son.succes();
        bouton.classList.add('option-bonne');
        etat.porteOk = true;
        sauver();
        setTimeout(afficher, 500);
      } else {
        son.erreur();
        vibrer([50, 40, 50]);
        bouton.classList.add('option-fausse');
        retour.className = 'retour retour-erreur';
        retour.textContent = typo('Verrouillage en cours…');
        etat.bloqueeJusqu = Date.now() + DUREE_BLOCAGE;
        sauver();
        setTimeout(afficher, 900);
      }
    });
    return bouton;
  });
  const carte = h('section', { class: 'carte accueil' },
    h('div', { class: 'cadeau', 'aria-hidden': 'true' }, '🔒'),
    h('h1', {}, P.titre),
    h('p', { class: 'consigne' }, P.consigne),
    h('h2', {}, P.question),
    h('div', { class: 'options' }, boutons),
    retour);
  ecranEl.append(carte);
  if (TEST) carte.append(h('button', { class: 'bouton-test', type: 'button', onclick: () => { etat.porteOk = true; sauver(); afficher(); } }, '⏭ Passer'));
}

// Écran de verrouillage : décompte en direct jusqu'à la fin du blocage.
function bloque() {
  const P = C.porte.bloque;
  const ligneTemps = h('p', { class: 'consigne centre' }, '');
  const carte = h('section', { class: 'carte accueil' },
    h('div', { class: 'cadeau', 'aria-hidden': 'true' }, '🔒'),
    h('h1', {}, P.titre),
    h('p', {}, P.texte),
    ligneTemps);
  ecranEl.append(carte);
  const maj = () => {
    const reste = etat.bloqueeJusqu - Date.now();
    if (reste <= 0) {
      arreterDecompte();
      etat.bloqueeJusqu = null;
      sauver();
      afficher();
      return;
    }
    ligneTemps.textContent = typo(P.decompte.replace('{temps}', formaterDecompte(reste)));
  };
  maj();
  decompteId = setInterval(maj, 1000);
  if (TEST) carte.append(h('button', { class: 'bouton-test', type: 'button', onclick: () => { etat.bloqueeJusqu = null; sauver(); afficher(); } }, '⏭ Passer'));
}

function arreterDecompte() {
  if (decompteId == null) return;
  clearInterval(decompteId);
  decompteId = null;
}

function formaterDecompte(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h2 = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h2, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function accueil() {
  const A = C.accueil;
  // Les navigateurs bloquent le son avant le premier geste : on tente tout de suite, sinon au premier toucher.
  son.activer();
  if (son.pret) son.anniversaire();
  else document.addEventListener('click', () => { son.activer(); son.anniversaire(); }, { once: true });
  ecranEl.append(h('section', { class: 'carte accueil' },
    h('div', { class: 'cadeau', 'aria-hidden': 'true' }, '🎁'),
    h('h1', {}, A.titre),
    A.texte.map((t) => h('p', {}, t)),
    h('button', {
      class: 'bouton', type: 'button',
      onclick: () => {
        son.activer();
        son.clic();
        etat.ecran = 1;
        etat.debut ??= Date.now();
        sauver();
        afficher();
      },
    }, A.bouton)));
}

// Ce que chaque énigme reçoit pour signaler une réussite ou une erreur.
function creerApi(carte, retour, surReussite) {
  let fini = false;
  return {
    son,
    vibrer,
    reussite() {
      if (fini) return;
      fini = true;
      surReussite();
    },
    erreur(message) {
      etat.erreurs++;
      sauver();
      son.erreur();
      vibrer([50, 40, 50]);
      carte.classList.remove('secoue');
      void carte.offsetWidth;
      carte.classList.add('secoue');
      retour.className = 'retour retour-erreur';
      retour.textContent = typo(message || aleatoire(C.erreurs));
    },
    info(message) {
      retour.className = 'retour';
      retour.textContent = typo(message);
    },
  };
}

function cadenas(i) {
  const d = C.cadenas[i];
  const zone = h('div', { class: 'enigme' });
  const retour = h('p', { class: 'retour', role: 'status', 'aria-live': 'polite' });
  const listeAides = h('ul', { class: 'aides-liste' });
  const boutonAide = h('button', { class: 'bouton-lien', type: 'button' });
  const carte = h('section', { class: 'carte' },
    h('p', { class: 'surtitre' }, `Cadenas n°${i + 1}`),
    h('h2', {}, d.titre),
    d.consigne && h('p', { class: 'consigne' }, d.consigne),
    zone,
    retour,
    d.aides.length > 0 && h('div', { class: 'aides' }, boutonAide, listeAides));
  ecranEl.append(carte);

  const api = creerApi(carte, retour, () => ouvrirCadenas(i));
  const enigme = ENIGMES[d.type].monter(zone, d, api) || {};

  // Deux coups de pouce, puis un joker qui donne la solution.
  const montrerJoker = () => {
    boutonAide.remove();
    listeAides.append(h('li', { class: 'joker' }, '🃏 ', d.solution,
      h('button', {
        class: 'bouton petit', type: 'button',
        onclick: () => {
          if (!enigme.resoudre) return api.reussite();
          enigme.resoudre();
          setTimeout(() => api.reussite(), 800);
        },
      }, 'Ouvrir le cadenas 🔓')));
  };
  const majAides = () => {
    const n = etat.aides[i];
    listeAides.replaceChildren(...d.aides.slice(0, n).map((t) => h('li', {}, '💡 ', t)));
    if (n > d.aides.length) return montrerJoker();
    boutonAide.textContent = typo(n === d.aides.length ? '🃏 Joker : voir la solution'
      : n ? 'Encore un coup de pouce ?' : 'Un coup de pouce ?');
  };
  for (let n = 1; n <= Math.min(etat.aides[i], d.aides.length); n++) enigme.aide?.(n);
  majAides();
  boutonAide.addEventListener('click', () => {
    son.clic();
    etat.aides[i]++;
    sauver();
    if (etat.aides[i] <= d.aides.length) enigme.aide?.(etat.aides[i]);
    majAides();
  });

  if (TEST) carte.append(h('button', { class: 'bouton-test', type: 'button', onclick: () => api.reussite() }, '⏭ Passer'));
}

function ouvrirCadenas(i) {
  const d = C.cadenas[i];
  son.succes();
  vibrer(120);
  confettis('petit');
  const li = rangee.children[i];
  li.classList.remove('actuel');
  li.classList.add('ouvert', 'saute');
  li.addEventListener('animationend', () => li.classList.remove('saute'), { once: true });
  etat.ecran = i + 2;
  sauver();
  majCarnet(i + 1, i);

  const grand = h('div', { class: 'grand-cadenas' }, svgCadenas());
  ouvrirModale(
    grand,
    h('p', { class: 'surtitre' }, 'Cadenas ouvert !'),
    d.indice.photo && h('img', { class: 'indice-photo', src: d.indice.photo, alt: '' }),
    h('p', { class: 'indice-numero' }, `Indice n°${i + 1}`),
    h('p', { class: 'indice-grand' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, d.indice.emoji), d.indice.texte),
    h('button', {
      class: 'bouton', type: 'button',
      onclick: () => {
        son.clic();
        afficher();
      },
    }, i + 1 < NB ? 'Cadenas suivant →' : 'Dernière étape →'));
  setTimeout(() => grand.classList.add('ouvert'), 250);
}

function voyage() {
  afficherVoyage(ecranEl, C.voyage, etat, {
    sauver,
    ouvrirModale,
    fermerModale,
    surReussite() {
      etat.ecran = REVELATION;
      etat.fin ??= Date.now();
      sauver();
      afficher();
    },
  });
}

function majCarnet(ouverts, nouveau = -1) {
  carnetEl.hidden = etat.ecran === 0 || etat.ecran >= VOYAGE;
  if (carnetEl.hidden) return;
  carnetEl.replaceChildren(
    h('h3', {}, `Carnet de route · ${ouverts}/${NB}`),
    h('ol', {}, C.cadenas.map((c, k) => (k < ouverts
      ? h('li', { class: k === nouveau ? 'nouveau' : null },
        h('span', { class: 'emoji', 'aria-hidden': 'true' }, c.indice.emoji), h('span', {}, c.indice.texte))
      : h('li', { class: 'vide' }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, '🔒'), h('span', {}, '…'))))));
}

function ouvrirModale(...contenu) {
  modaleEl.replaceChildren(h('div', { class: 'modale-contenu', role: 'dialog', 'aria-modal': 'true' }, contenu));
  modaleEl.hidden = false;
  modaleEl.querySelector('button')?.focus({ preventScroll: true });
}

function fermerModale() {
  modaleEl.hidden = true;
  modaleEl.replaceChildren();
}

function recommencer() {
  if (!confirm('Tout recommencer depuis le début ?')) return;
  etat = etatInitial();
  sauver();
  afficher();
}

const majSon = () => {
  boutonSon.textContent = son.muet ? '🔇' : '🔊';
  boutonSon.setAttribute('aria-label', son.muet ? 'Activer le son' : 'Couper le son');
};
boutonSon.addEventListener('click', () => {
  son.activer();
  son.basculer();
  majSon();
  son.clic();
});
majSon();
document.addEventListener('pointerdown', () => son.activer(), { once: true });
document.getElementById('recommencer').addEventListener('click', recommencer);

if (TEST) {
  document.body.classList.add('mode-test');
  window.__jeu = {
    aller(n) { etat.ecran = n; sauver(); afficher(); },
    etat: () => JSON.parse(JSON.stringify(etat)),
  };
}

afficher();
