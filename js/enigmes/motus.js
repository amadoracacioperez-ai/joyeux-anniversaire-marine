import { h } from '../utils.js';

const CLAVIER = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const RANG = { absent: 1, mal: 2, bien: 3 };
const PAS = 170; // ms entre deux lettres dévoilées

// Comme dans Motus : rouge = bien placée, jaune = présente mais mal placée.
function evaluer(essai, mot) {
  const res = Array(mot.length).fill('absent');
  const restantes = {};
  for (let i = 0; i < mot.length; i++) {
    if (essai[i] === mot[i]) res[i] = 'bien';
    else restantes[mot[i]] = (restantes[mot[i]] || 0) + 1;
  }
  for (let i = 0; i < mot.length; i++) {
    if (res[i] !== 'bien' && restantes[essai[i]] > 0) {
      res[i] = 'mal';
      restantes[essai[i]]--;
    }
  }
  return res;
}

export function monter(zone, d, api) {
  const MOT = d.mot.toUpperCase();
  const L = MOT.length;
  const ESSAIS = d.essais || 6;
  const connues = new Set([0]); // positions déjà trouvées, rappelées en fantôme
  const etatTouches = {};
  let ligne = 0;
  let saisie = MOT[0];
  let occupe = false;
  let fini = false;

  const grille = h('div', { class: 'motus', style: { '--n': L } });
  const cases = Array.from({ length: ESSAIS }, () => Array.from({ length: L }, () => {
    const el = h('div', { class: 'motus-case' });
    grille.append(el);
    return el;
  }));

  const touches = {};
  const touche = (libelle, valeur, large = false) => {
    const b = h('button', { class: large ? 'touche large' : 'touche', type: 'button', 'data-touche': valeur }, libelle);
    b.addEventListener('click', () => appuyer(valeur));
    touches[valeur] = b;
    return b;
  };
  const clavier = h('div', { class: 'clavier' }, CLAVIER.map((rang, k) => h('div', { class: 'clavier-rang' },
    k === 2 && touche('⌫', 'effacer', true),
    [...rang].map((l) => touche(l, l)),
    k === 2 && touche('Entrée', 'valider', true))));

  function dessiner() {
    cases[ligne].forEach((el, c) => {
      el.classList.add('courante');
      const tapee = c < saisie.length;
      el.classList.toggle('fantome', !tapee);
      el.textContent = tapee ? saisie[c] : connues.has(c) ? MOT[c] : '·';
    });
  }

  function appuyer(valeur) {
    if (fini || occupe) return;
    if (valeur === 'valider') return valider();
    if (valeur === 'effacer') {
      if (saisie.length > 1) saisie = saisie.slice(0, -1);
    } else if (saisie.length < L) {
      saisie += valeur;
      api.son.clic();
    }
    dessiner();
  }

  function valider() {
    if (saisie.length < L) return api.info(`Il faut ${L} lettres !`);
    occupe = true;
    const essai = saisie;
    const res = evaluer(essai, MOT);
    const rangee = cases[ligne];
    res.forEach((r, c) => setTimeout(() => {
      rangee[c].classList.remove('courante', 'fantome');
      rangee[c].replaceChildren(h('span', {}, essai[c]));
      rangee[c].classList.add(r, 'revelee');
      api.son.note(r === 'bien' ? 784 : r === 'mal' ? 587 : 392, 0, 0.12, { type: 'triangle', volume: 0.08 });
    }, c * PAS));
    res.forEach((r, c) => {
      if (r === 'bien') connues.add(c);
      if (RANG[r] > (RANG[etatTouches[essai[c]]] || 0)) etatTouches[essai[c]] = r;
    });

    setTimeout(() => {
      occupe = false;
      for (const [lettre, r] of Object.entries(etatTouches)) {
        touches[lettre]?.classList.remove('bien', 'mal', 'absent');
        touches[lettre]?.classList.add(r);
      }
      if (essai === MOT) {
        fini = true;
        api.reussite();
        return;
      }
      if (ligne + 1 >= ESSAIS) {
        api.erreur('Plus d\'essais… On efface tout et on recommence ! 😉');
        cases.flat().forEach((el) => { el.className = 'motus-case'; el.textContent = ''; });
        ligne = 0;
      } else {
        api.info('');
        ligne++;
      }
      saisie = MOT[0];
      dessiner();
    }, L * PAS + 250);
  }

  function clavierPhysique(e) {
    if (!zone.isConnected) {
      document.removeEventListener('keydown', clavierPhysique);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      appuyer('valider');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      appuyer('effacer');
    } else {
      const lettre = e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
      if (/^[A-Z]$/.test(lettre)) appuyer(lettre);
    }
  }
  document.addEventListener('keydown', clavierPhysique);

  dessiner();
  zone.append(grille, clavier);
}
