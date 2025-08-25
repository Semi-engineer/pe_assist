// OEE Calculator logic
const $ = id => document.getElementById(id);
const pct = x => (Math.round(x * 1000) / 10) + "%";
const qsa = sel => Array.from(document.querySelectorAll(sel));

function calcOEE() {
  const planned = +$('planned').value || 0;
  const downtime = +$('downtime').value || 0;
  const total = +$('total').value || 0;
  const ict = +$('ict').value || 0;
  const good = +$('good').value || 0;

  const runtime = Math.max(planned - downtime, 0);
  const availability = planned ? runtime / planned : 0;
  const ideal = total * (ict / 60);
  const performance = (runtime && ideal) ? Math.min(ideal / runtime, 1) : 0;
  const quality = total ? (good / total) : 0;
  const oee = availability * performance * quality;

  $('availability').textContent = pct(availability);
  $('performance').textContent = pct(performance);
  $('quality').textContent = pct(quality);
  $('oee').textContent = pct(oee);
}

// Event bindings
document.addEventListener("DOMContentLoaded", () => {
  $('calc').addEventListener('click', calcOEE);
  $('reset').addEventListener('click', () =>
    qsa('.input').forEach(i => i.value = '')
  );
});
