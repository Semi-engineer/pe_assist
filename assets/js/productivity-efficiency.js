// pe.js

document.addEventListener("DOMContentLoaded", () => {
  const workTimeInput = document.getElementById("workTime");
  const demandInput = document.getElementById("demand");
  const totalCycleInput = document.getElementById("totalCycle");
  const longestCycleInput = document.getElementById("longestCycle");
  const stationsInput = document.getElementById("stations");

  const taktOutput = document.getElementById("takt");
  const efficiencyOutput = document.getElementById("efficiency");
  const manpowerOutput = document.getElementById("manpower");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const workTime = parseFloat(workTimeInput.value);
    const demand = parseFloat(demandInput.value);
    const totalCycle = parseFloat(totalCycleInput.value);
    const longestCycle = parseFloat(longestCycleInput.value);
    const stations = parseFloat(stationsInput.value);

    if (
      isNaN(workTime) || isNaN(demand) || isNaN(totalCycle) ||
      isNaN(longestCycle) || isNaN(stations) ||
      workTime <= 0 || demand <= 0 || totalCycle <= 0 || longestCycle <= 0 || stations <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // Takt Time (sec) = Available Time (sec) / Demand
    const availableSec = workTime * 60;
    const taktTime = availableSec / demand;

    // Line Efficiency (%) = (Sum of all station times) / (No. of stations * Longest station time) * 100
    const efficiency = (totalCycle / (stations * longestCycle)) * 100;

    // Manpower Required = Total Cycle Time / Takt Time
    const manpower = totalCycle / taktTime;

    taktOutput.innerText = taktTime.toFixed(1) + " sec";
    efficiencyOutput.innerText = efficiency.toFixed(1) + " %";
    manpowerOutput.innerText = manpower.toFixed(1) + " persons";
  }

  function resetFields() {
    workTimeInput.value = 480;
    demandInput.value = 400;
    totalCycleInput.value = 240;
    longestCycleInput.value = 70;
    stationsInput.value = 5;

    taktOutput.innerText = "-";
    efficiencyOutput.innerText = "-";
    manpowerOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
