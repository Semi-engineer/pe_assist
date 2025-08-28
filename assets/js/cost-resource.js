// cr.js

document.addEventListener("DOMContentLoaded", () => {
  const laborInput = document.getElementById("laborCost");
  const machineInput = document.getElementById("machineCost");
  const overheadInput = document.getElementById("overhead");
  const cycleTimeInput = document.getElementById("cycleTime");
  const workTimeInput = document.getElementById("workTime");
  const demandInput = document.getElementById("demand");

  const cpuOutput = document.getElementById("cpu");
  const capacityOutput = document.getElementById("capacity");
  const utilizationOutput = document.getElementById("utilization");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const labor = parseFloat(laborInput.value);
    const machine = parseFloat(machineInput.value);
    const overhead = parseFloat(overheadInput.value);
    const cycleTime = parseFloat(cycleTimeInput.value);
    const workTime = parseFloat(workTimeInput.value);
    const demand = parseFloat(demandInput.value);

    if (
      isNaN(labor) || isNaN(machine) || isNaN(overhead) ||
      isNaN(cycleTime) || isNaN(workTime) || isNaN(demand) ||
      labor <= 0 || machine <= 0 || cycleTime <= 0 || workTime <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // เวลาผลิตต่อชิ้น (ชั่วโมง)
    const cycleHr = cycleTime / 3600;

    // ต้นทุนต่อชั่วโมงรวม
    const costPerHr = labor + machine + overhead;

    // Cost per Unit
    const costPerUnit = costPerHr * cycleHr;

    // Line Capacity (pcs)
    const availableSec = workTime * 60;
    const capacity = availableSec / cycleTime;

    // Resource Utilization (%)
    const utilization = (demand / capacity) * 100;

    cpuOutput.innerText = costPerUnit.toFixed(2) + " /pcs";
    capacityOutput.innerText = capacity.toFixed(0) + " pcs";
    utilizationOutput.innerText = utilization.toFixed(1) + " %";
  }

  function resetFields() {
    laborInput.value = 200;
    machineInput.value = 150;
    overheadInput.value = 50;
    cycleTimeInput.value = 60;
    workTimeInput.value = 480;
    demandInput.value = 400;

    cpuOutput.innerText = "-";
    capacityOutput.innerText = "-";
    utilizationOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
