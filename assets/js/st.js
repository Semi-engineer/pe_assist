// Standard Time Estimator logic
const $ = id => document.getElementById(id);
const f2 = x => Math.round(x*100)/100;
const qsa = sel => Array.from(document.querySelectorAll(sel));

function calcST() {
  const mean = +$('mean').value || 0;
  const rating = +$('rating').value || 0;
  const allow = +$('allow').value || 0;

  const nt = mean * (rating / 100);
  const st = nt * (1 + allow / 100);
  const cap = st > 0 ? 3600 / st : 0;

  $('nt').textContent = f2(nt) + ' sec/pc';
  $('st').textContent = f2(st) + ' sec/pc';
  $('cap').textContent = Math.floor(cap) + ' pcs/hr';
}

// Event bindings
document.addEventListener("DOMContentLoaded", () => {
  $('calc').addEventListener('click', calcST);
  $('reset').addEventListener('click', () => qsa('.input').forEach(i => i.value = ''));
});
