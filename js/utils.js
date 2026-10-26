// Petites briques partagées par tout le jeu.

// Typographie française : espace insécable avant ! ? : ; » et après «, et devant un emoji,
// pour qu'aucun signe ne se retrouve seul en début de ligne.
export const typo = (texte) => String(texte)
  .replace(/ ([!?:;»])/g, ' $1')
  .replace(/« /g, '« ')
  .replace(/ (?=[\p{Extended_Pictographic}\p{Regional_Indicator}])/gu, ' ');

export function h(tag, attrs, ...enfants) {
  const el = document.createElement(tag);
  for (const [cle, val] of Object.entries(attrs || {})) {
    if (val == null || val === false) continue;
    if (cle.startsWith('on') && typeof val === 'function') el.addEventListener(cle.slice(2), val);
    else if (cle === 'class') el.className = val;
    else if (cle === 'style' && typeof val === 'object') {
      for (const [prop, v] of Object.entries(val)) {
        el.style.setProperty(prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v);
      }
    } else el.setAttribute(cle, val === true ? '' : val);
  }
  for (const enfant of enfants.flat()) {
    if (enfant != null && enfant !== false) el.append(enfant instanceof Node ? enfant : typo(enfant));
  }
  return el;
}

export function decoder(b64) {
  const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(octets));
}

const ARTICLES = /^(?:le|la|les|l|un|une|des|du|de|d|mon|ma|mes|ton|ta|tes|c est|cest)\s+/;

// « C'est le Vélo ! » → « velo » : sans accents, majuscules, ponctuation ni articles.
export function normaliser(texte) {
  let t = String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  for (let avant = ''; avant !== t;) {
    avant = t;
    t = t.replace(ARTICLES, '');
  }
  return t;
}

const contient = (s, mot) => (Array.isArray(mot)
  ? mot.some((variante) => contient(s, variante))
  : s.includes(` ${normaliser(mot)} `));

// Une réponse en liste exige chacun de ses éléments, dans n'importe quel ordre :
// [["soupe", "soup"], "whisky"] accepte « du whisky et de la soup ».
export function correspond(saisie, reponses) {
  const s = ` ${normaliser(saisie)} `;
  return s.trim() !== '' && reponses.some((r) => (Array.isArray(r)
    ? r.every((mot) => contient(s, mot))
    : contient(s, r)));
}

export function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export const aleatoire = (liste) => liste[Math.floor(Math.random() * liste.length)];

export function vibrer(motif) {
  try { navigator.vibrate?.(motif); } catch {}
}

const SVG_CADENAS = '<svg class="cadenas-svg" viewBox="0 0 24 24" aria-hidden="true">'
  + '<path class="anse" d="M7 11V7.5a5 5 0 0 1 10 0V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
  + '<rect x="4" y="11" width="16" height="11" rx="2.6" fill="currentColor"/>'
  + '<path class="trou" d="M12 14.8v3" stroke-width="2.2" stroke-linecap="round"/></svg>';

export function svgCadenas() {
  const modele = document.createElement('template');
  modele.innerHTML = SVG_CADENAS;
  return modele.content.firstElementChild;
}

export function formulaireReponse(api, reponses, placeholder = 'Ta réponse…') {
  const champ = h('input', {
    class: 'champ', type: 'text', placeholder, autocomplete: 'off', autocapitalize: 'off',
    autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': 'Ta réponse',
  });
  const form = h('form', { class: 'formulaire', novalidate: true },
    champ, h('button', { class: 'bouton', type: 'submit' }, 'Valider'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!champ.value.trim()) return champ.focus();
    if (correspond(champ.value, reponses)) {
      champ.blur();
      api.reussite();
    } else {
      api.erreur();
      champ.select();
    }
  });
  return form;
}

// ---------- sons (WebAudio, aucun fichier à télécharger) ----------

let ctx = null;
let muet = false;
try { muet = localStorage.getItem('cadeau-mystere-son') === 'off'; } catch {}

export const son = {
  get muet() { return muet; },

  basculer() {
    muet = !muet;
    try { localStorage.setItem('cadeau-mystere-son', muet ? 'off' : 'on'); } catch {}
  },

  // Les navigateurs mobiles n'autorisent le son qu'après un geste de l'utilisatrice.
  activer() {
    if (!ctx) {
      const Contexte = window.AudioContext || window.webkitAudioContext;
      if (!Contexte) return;
      ctx = new Contexte();
    }
    if (ctx.state === 'suspended') ctx.resume();
  },

  note(freq, debut, duree, { type = 'sine', volume = 0.15, force = false } = {}) {
    if (!ctx || (muet && !force)) return;
    const t0 = ctx.currentTime + debut;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.setValueAtTime(volume, t0 + Math.max(0.012, duree - 0.03));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duree + 0.05);
  },

  clic() { this.note(880, 0, 0.05, { type: 'triangle', volume: 0.06 }); },

  succes() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => this.note(f, k * 0.09, 0.22, { type: 'triangle' }));
  },

  erreur() {
    this.note(220, 0, 0.12, { type: 'square', volume: 0.05 });
    this.note(164.81, 0.13, 0.22, { type: 'square', volume: 0.05 });
  },

  fanfare() {
    [[523.25, 0, 0.16], [523.25, 0.18, 0.16], [523.25, 0.36, 0.16], [698.46, 0.54, 0.5],
      [880, 1.06, 0.2], [783.99, 1.28, 0.2], [1046.5, 1.5, 0.9]]
      .forEach(([f, t, d]) => this.note(f, t, d, { type: 'triangle', volume: 0.14 }));
  },

  get pret() { return ctx?.state === 'running'; },

  // « Joyeux anniversaire », avec le même timbre que la fanfare. Durées en temps (3/4).
  anniversaire() {
    const [G, A, B, C, D, E, F, G2] = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99];
    const air = [
      [G, 0.75], [G, 0.25], [A, 1], [G, 1], [C, 1], [B, 2],
      [G, 0.75], [G, 0.25], [A, 1], [G, 1], [D, 1], [C, 2],
      [G, 0.75], [G, 0.25], [G2, 1], [E, 1], [C, 1], [B, 1], [A, 2],
      [F, 0.75], [F, 0.25], [E, 1], [C, 1], [D, 1], [C, 3],
    ];
    const temps = 0.36;
    let t = 0.05;
    for (const [f, d] of air) {
      this.note(f, t, d * temps * 0.92, { type: 'triangle', volume: 0.14 });
      t += d * temps;
    }
  },

  // Joue le morse (même si le son est coupé : c'est elle qui a demandé à écouter)
  // et prévient à chaque symbole pour l'allumer à l'écran.
  morse(lettres, surSymbole) {
    this.activer();
    const u = 0.11;
    let t = 0.1;
    let k = 0;
    for (const lettre of lettres) {
      for (const s of lettre) {
        const duree = s === '.' ? u : 3 * u;
        const idx = k++;
        this.note(640, t, duree, { volume: 0.2, force: true });
        setTimeout(() => surSymbole(idx, true), t * 1000);
        setTimeout(() => surSymbole(idx, false), (t + duree) * 1000);
        t += duree + u;
      }
      t += 2 * u;
    }
    return new Promise((ok) => setTimeout(ok, t * 1000));
  },
};

// ---------- confettis (canvas-confetti, chargé dans index.html) ----------

const COULEURS = ['#f2b134', '#ffd77a', '#e4572e', '#ffffff', '#5b8def', '#ff8fab'];

export function confettis(type = 'petit') {
  const tirer = window.confetti;
  if (!tirer) return;
  const base = { colors: COULEURS, zIndex: 1000, disableForReducedMotion: true };
  if (type === 'petit') {
    tirer({ ...base, particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.3 } });
    return;
  }
  tirer({ ...base, particleCount: 180, spread: 110, startVelocity: 50, origin: { y: 0.35 } });
  const fin = Date.now() + 2800;
  (function canons() {
    tirer({ ...base, particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.75 } });
    tirer({ ...base, particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } });
    if (Date.now() < fin) requestAnimationFrame(canons);
  })();
}
