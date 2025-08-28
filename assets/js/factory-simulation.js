// factory-simulation.js

document.addEventListener("DOMContentLoaded", () => {
  const machinesInput = document.getElementById("machines");
  const workersInput = document.getElementById("workers");
  const cycleTimeInput = document.getElementById("cycleTime");
  const workTimeInput = document.getElementById("workTime");
  const demandInput = document.getElementById("demand");

  const throughputOutput = document.getElementById("throughput");
  const utilizationOutput = document.getElementById("utilization");
  const bottleneckOutput = document.getElementById("bottleneck");
  const fulfillmentOutput = document.getElementById("fulfillment");

  const simulateBtn = document.getElementById("simulate");
  const resetBtn = document.getElementById("reset");

  function simulate() {
    const machines = parseFloat(machinesInput.value);
    const workers = parseFloat(workersInput.value);
    const cycleTime = parseFloat(cycleTimeInput.value);
    const workTime = parseFloat(workTimeInput.value);
    const demand = parseFloat(demandInput.value);

    if (
      isNaN(machines) || isNaN(workers) || isNaN(cycleTime) ||
      isNaN(workTime) || isNaN(demand) ||
      machines <= 0 || workers <= 0 || cycleTime <= 0 || workTime <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    const availableSec = workTime * 60;

    // กำลังการผลิตสูงสุด (ขึ้นกับ bottleneck: min(machines, workers))
    const bottleneck = machines < workers ? "Machines" : "Workers";
    const effectiveResources = Math.min(machines, workers);

    // Throughput = (Available Time / Cycle Time) * Effective Resources
    const throughput = (availableSec / cycleTime) * effectiveResources;

    // Utilization (%) = Demand / Capacity
    const utilization = (demand / throughput) * 100;

    // Demand Fulfillment (%)
    const fulfillment = (throughput / demand) * 100;

    throughputOutput.innerText = throughput.toFixed(0) + " pcs";
    utilizationOutput.innerText = utilization.toFixed(1) + " %";
    bottleneckOutput.innerText = bottleneck;
    fulfillmentOutput.innerText = fulfillment.toFixed(1) + " %";
  }

  function resetFields() {
    machinesInput.value = 3;
    workersInput.value = 5;
    cycleTimeInput.value = 60;
    workTimeInput.value = 480;
    demandInput.value = 400;

    throughputOutput.innerText = "-";
    utilizationOutput.innerText = "-";
    bottleneckOutput.innerText = "-";
    fulfillmentOutput.innerText = "-";
  }

  simulateBtn.addEventListener("click", simulate);
  resetBtn.addEventListener("click", resetFields);
});
