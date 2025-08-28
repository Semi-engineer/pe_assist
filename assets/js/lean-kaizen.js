document.addEventListener("DOMContentLoaded", () => {
  // Waste Time Analyzer Elements
  const vaInput = document.getElementById("vaTime");
  const nvaInput = document.getElementById("nvaTime");
  const vaOutput = document.getElementById("vaPercent");
  const nvaOutput = document.getElementById("nvaPercent");
  const calcWasteBtn = document.getElementById("calcWaste");
  const resetWasteBtn = document.getElementById("resetWaste");

  // SMED Elements
  const setupInitialInput = document.getElementById("setupInitial");
  const setupReducedInput = document.getElementById("setupReduced");
  const timeSavedOutput = document.getElementById("timeSaved");
  const percentImprovementOutput = document.getElementById("percentImprovement");
  const calcSMEDBtn = document.getElementById("calcSMED");
  const resetSMEDBtn = document.getElementById("resetSMED");

  // Waste Time Calculator
  function calculateWaste() {
    const va = parseFloat(vaInput.value);
    const nva = parseFloat(nvaInput.value);

    if (isNaN(va) || isNaN(nva) || va < 0 || nva < 0) {
      alert("⚠️ กรุณากรอกค่าตัวเลขที่ถูกต้อง (ไม่ติดลบ)");
      return;
    }

    const total = va + nva;
    const vaPercent = (va / total) * 100;
    const nvaPercent = (nva / total) * 100;

    vaOutput.innerText = vaPercent.toFixed(1) + " %";
    nvaOutput.innerText = nvaPercent.toFixed(1) + " %";
  }

  function resetWaste() {
    vaInput.value = 30;
    nvaInput.value = 20;
    vaOutput.innerText = "-";
    nvaOutput.innerText = "-";
  }

  calcWasteBtn.addEventListener("click", calculateWaste);
  resetWasteBtn.addEventListener("click", resetWaste);

  // SMED Calculator
  function calculateSMED() {
    const initial = parseFloat(setupInitialInput.value);
    const reduced = parseFloat(setupReducedInput.value);

    if (isNaN(initial) || isNaN(reduced) || initial <= 0 || reduced < 0 || reduced > initial) {
      alert("⚠️ กรุณากรอกค่าตัวเลขที่ถูกต้อง");
      return;
    }

    const timeSaved = initial - reduced;
    const percentImprovement = (timeSaved / initial) * 100;

    timeSavedOutput.innerText = timeSaved.toFixed(1) + " min";
    percentImprovementOutput.innerText = percentImprovement.toFixed(1) + " %";
  }

  function resetSMED() {
    setupInitialInput.value = 60;
    setupReducedInput.value = 25;
    timeSavedOutput.innerText = "-";
    percentImprovementOutput.innerText = "-";
  }

  calcSMEDBtn.addEventListener("click", calculateSMED);
  resetSMEDBtn.addEventListener("click", resetSMED);
});
