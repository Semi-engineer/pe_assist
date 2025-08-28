// lf.js

document.addEventListener("DOMContentLoaded", () => {
  const distanceInput = document.getElementById("distance");
  const movesInput = document.getElementById("moves");
  const cycleTimeInput = document.getElementById("cycleTime");
  const workTimeInput = document.getElementById("workTime");
  const demandInput = document.getElementById("demand");

  const avgDistanceOutput = document.getElementById("avgDistance");
  const capacityOutput = document.getElementById("capacity");
  const fulfillmentOutput = document.getElementById("fulfillment");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const distance = parseFloat(distanceInput.value);
    const moves = parseFloat(movesInput.value);
    const cycleTime = parseFloat(cycleTimeInput.value);
    const workTime = parseFloat(workTimeInput.value);
    const demand = parseFloat(demandInput.value);

    if (
      isNaN(distance) || isNaN(moves) || isNaN(cycleTime) ||
      isNaN(workTime) || isNaN(demand) ||
      distance <= 0 || moves <= 0 || cycleTime <= 0 || workTime <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // Avg Move Distance
    const avgDistance = distance / moves;

    // Line Capacity (pcs) = Available Time (sec) / Cycle Time
    const availableSec = workTime * 60;
    const capacity = availableSec / cycleTime;

    // Demand Fulfillment (%)
    const fulfillment = (capacity / demand) * 100;

    avgDistanceOutput.innerText = avgDistance.toFixed(2) + " m/move";
    capacityOutput.innerText = capacity.toFixed(0) + " pcs";
    fulfillmentOutput.innerText = fulfillment.toFixed(1) + " %";
  }

  function resetFields() {
    distanceInput.value = 100;
    movesInput.value = 20;
    cycleTimeInput.value = 60;
    workTimeInput.value = 480;
    demandInput.value = 400;

    avgDistanceOutput.innerText = "-";
    capacityOutput.innerText = "-";
    fulfillmentOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
