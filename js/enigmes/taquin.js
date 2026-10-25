import { h, typo } from '../utils.js';

const N = 3;
const VIDE = N * N - 1;

function voisins(pos) {
  const ligne = Math.floor(pos / N);
  const col = pos % N;
  const v = [];
  if (ligne > 0) v.push(pos - N);
  if (ligne < N - 1) v.push(pos + N);
  if (col > 0) v.push(pos - 1);
  if (col < N - 1) v.push(pos + 1);
  return v;
}

const estResolu = (ordre) => ordre.every((piece, pos) => piece === pos);

// Mélange par coups valides à partir de l'image reconstituée : le taquin est toujours faisable.
function melanger(coups = 40) {
  const ordre = [...Array(N * N).keys()];
  let vide = VIDE;
  let precedent = -1;
  for (let k = 0; k < coups || estResolu(ordre); k++) {
    const choix = voisins(vide).filter((p) => p !== precedent);
    const p = choix[Math.floor(Math.random() * choix.length)];
    [ordre[vide], ordre[p]] = [ordre[p], ordre[vide]];
    precedent = vide;
    vide = p;
  }
  return ordre;
}

export function monter(zone, d, api) {
  let ordre = melanger(); // ordre[position] = pièce
  let coups = 0;
  let fini = false;

  const grille = h('div', { class: 'taquin', role: 'group', 'aria-label': 'Taquin' });
  const compteur = h('p', { class: 'taquin-coups' }, 'Coups : 0');
  const modele = h('img', { class: 'taquin-modele', src: d.image, alt: 'Modèle à reconstituer', hidden: true });
  const pieces = [...Array(N * N).keys()].map((p) => {
    const el = h('button', {
      class: p === VIDE ? 'piece piece-vide' : 'piece',
      type: 'button',
      'data-piece': p,
      'aria-label': `Pièce ${p + 1}`,
      tabindex: p === VIDE ? '-1' : null,
      style: {
        backgroundImage: `url("${d.image}")`,
        backgroundPosition: `${(p % N) * 50}% ${Math.floor(p / N) * 50}%`,
      },
    }, h('span', { class: 'piece-num' }, p + 1));
    el.addEventListener('click', () => deplacer(p));
    grille.append(el);
    return el;
  });

  function placer() {
    ordre.forEach((piece, pos) => {
      pieces[piece].style.transform = `translate(${(pos % N) * 100}%, ${Math.floor(pos / N) * 100}%)`;
      pieces[piece].dataset.pos = pos;
    });
  }

  function deplacer(piece) {
    if (fini || piece === VIDE) return;
    const pos = ordre.indexOf(piece);
    const vide = ordre.indexOf(VIDE);
    if (!voisins(vide).includes(pos)) return;
    [ordre[pos], ordre[vide]] = [ordre[vide], ordre[pos]];
    compteur.textContent = typo(`Coups : ${++coups}`);
    api.son.clic();
    placer();
    if (estResolu(ordre)) {
      fini = true;
      grille.classList.add('resolu');
      setTimeout(() => api.reussite(), 900);
    }
  }

  placer();
  zone.append(grille, compteur, modele);

  return {
    aide(n) {
      if (n === 1) modele.hidden = false;
      if (n === 2) grille.classList.add('avec-numeros');
    },
    resoudre() {
      ordre = [...Array(N * N).keys()];
      fini = true;
      placer();
      grille.classList.add('resolu');
    },
  };
}
