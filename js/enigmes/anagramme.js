import { h, melanger } from '../utils.js';

export function monter(zone, d, api) {
  const MOT = d.mot.toUpperCase();
  const lettres = [...d.lettres.toUpperCase()];
  let places = Array(MOT.length).fill(null); // index de la lettre posée dans chaque case
  let fini = false;

  const emplacements = h('div', { class: 'anag-emplacements', style: { '--n': MOT.length } });
  const cases = places.map((_, k) => {
    const el = h('button', { class: 'anag-case', type: 'button', 'aria-label': `Case ${k + 1}` });
    el.addEventListener('click', () => retirer(k));
    emplacements.append(el);
    return el;
  });
  const reserve = h('div', { class: 'anag-reserve', style: { '--n': lettres.length } });
  const tuiles = lettres.map((l, i) => {
    const el = h('button', { class: 'anag-tuile', type: 'button', 'data-lettre': l }, l);
    el.addEventListener('click', () => poser(i));
    reserve.append(el);
    return el;
  });

  function maj() {
    cases.forEach((el, k) => {
      el.textContent = places[k] == null ? '' : lettres[places[k]];
      el.classList.toggle('remplie', places[k] != null);
    });
    tuiles.forEach((el, i) => { el.disabled = places.includes(i); });
  }

  function poser(i) {
    const k = places.indexOf(null);
    if (fini || k < 0 || places.includes(i)) return;
    places[k] = i;
    api.son.clic();
    maj();
    if (!places.includes(null)) verifier();
  }

  function retirer(k) {
    if (fini || places[k] == null) return;
    places[k] = null;
    api.son.clic();
    maj();
  }

  function verifier() {
    if (places.map((i) => lettres[i]).join('') !== MOT) return api.erreur();
    fini = true;
    emplacements.classList.add('gagne');
    setTimeout(() => api.reussite(), 500);
  }

  zone.append(emplacements, reserve, h('div', { class: 'anag-actions' },
    h('button', {
      class: 'bouton secondaire petit', type: 'button',
      onclick: () => {
        melanger(tuiles).forEach((el) => reserve.append(el));
        api.son.clic();
      },
    }, '🔀 Mélanger'),
    h('button', {
      class: 'bouton secondaire petit', type: 'button',
      onclick: () => {
        if (fini) return;
        places = places.map(() => null);
        maj();
      },
    }, '↺ Effacer')));
  maj();

  return {
    resoudre() {
      const libres = lettres.map((_, i) => i);
      places = [...MOT].map((l) => libres.splice(libres.findIndex((i) => lettres[i] === l), 1)[0]);
      fini = true;
      maj();
      emplacements.classList.add('gagne');
    },
  };
}
