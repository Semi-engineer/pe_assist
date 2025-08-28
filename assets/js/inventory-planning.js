// inventory-planning.js

document.addEventListener("DOMContentLoaded", () => {
  const demandInput = document.getElementById("demand");
  const orderCostInput = document.getElementById("orderCost");
  const holdingCostInput = document.getElementById("holdingCost");
  const leadTimeInput = document.getElementById("leadTime");
  const dailyDemandInput = document.getElementById("dailyDemand");
  const zValueInput = document.getElementById("zValue");
  const demandStdDevInput = document.getElementById("demandStdDev");

  const eoqOutput = document.getElementById("eoq");
  const safetyStockOutput = document.getElementById("safetyStock");
  const ropOutput = document.getElementById("rop");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const demand = parseFloat(demandInput.value);
    const orderCost = parseFloat(orderCostInput.value);
    const holdingCost = parseFloat(holdingCostInput.value);
    const leadTime = parseFloat(leadTimeInput.value);
    const dailyDemand = parseFloat(dailyDemandInput.value);
    const zValue = parseFloat(zValueInput.value);
    const demandStdDev = parseFloat(demandStdDevInput.value);

    if (
      isNaN(demand) || isNaN(orderCost) || isNaN(holdingCost) ||
      isNaN(leadTime) || isNaN(dailyDemand) || isNaN(zValue) || isNaN(demandStdDev) ||
      demand <= 0 || orderCost <= 0 || holdingCost <= 0 || leadTime <= 0 || dailyDemand <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // EOQ = sqrt((2DS)/H)
    const eoq = Math.sqrt((2 * demand * orderCost) / holdingCost);

    // Safety Stock = Z * σd * √LT
    const safetyStock = zValue * demandStdDev * Math.sqrt(leadTime);

    // Reorder Point = (Daily Demand * Lead Time) + Safety Stock
    const rop = (dailyDemand * leadTime) + safetyStock;

    eoqOutput.innerText = eoq.toFixed(0) + " pcs";
    safetyStockOutput.innerText = safetyStock.toFixed(0) + " pcs";
    ropOutput.innerText = rop.toFixed(0) + " pcs";
  }

  function resetFields() {
    demandInput.value = 10000;
    orderCostInput.value = 500;
    holdingCostInput.value = 20;
    leadTimeInput.value = 7;
    dailyDemandInput.value = 40;
    zValueInput.value = 1.65;
    demandStdDevInput.value = 10;

    eoqOutput.innerText = "-";
    safetyStockOutput.innerText = "-";
    ropOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
