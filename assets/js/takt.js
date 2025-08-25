// Takt Time Calculator logic
const $ = id => document.getElementById(id);
const f2 = x => Math.round(x*100)/100;
const qsa = sel => Array.from(document.querySelectorAll(sel));

function calcTakt() {
  const avail = (+$('avail').value || 0) - (+$('break').value || 0);
  const demand = +$('demand').value || 0;

  const takt = demand ? (avail*60)/demand : 0; // sec/pc
  const tph = takt > 0 ? 3600 / takt : 0;

  $('takt').textContent = f2(takt) + ' sec/pc';
  $('tph').textContent = Math.floor(tph) + ' pcs/hr';
}

// Event bindings
document.addEventListener("DOMContentLoaded", () => {
  $('calc').addEventListener('click', calcTakt);
  $('reset').addEventListener('click', () => qsa('.input').forEach(i => i.value = ''));
});
