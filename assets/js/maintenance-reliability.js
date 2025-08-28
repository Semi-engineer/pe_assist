// maintenance-reliability.js

document.addEventListener("DOMContentLoaded", () => {
  const runtimeInput = document.getElementById("runtime");
  const failuresInput = document.getElementById("failures");
  const downtimeInput = document.getElementById("downtime");
  const intervalInput = document.getElementById("interval");
  const confidenceInput = document.getElementById("confidence");

  const mtbfOutput = document.getElementById("mtbf");
  const mttrOutput = document.getElementById("mttr");
  const availabilityOutput = document.getElementById("availability");
  const pmIntervalOutput = document.getElementById("pmInterval");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const runtime = parseFloat(runtimeInput.value);
    const failures = parseFloat(failuresInput.value);
    const downtime = parseFloat(downtimeInput.value);
    const plannedInterval = parseFloat(intervalInput.value);
    const confidence = parseFloat(confidenceInput.value);

    if (
      isNaN(runtime) || isNaN(failures) || isNaN(downtime) ||
      isNaN(plannedInterval) || isNaN(confidence) ||
      runtime <= 0 || failures < 0 || downtime < 0 || plannedInterval <= 0 || confidence <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // MTBF = Operating Time / Failures
    const mtbf = failures > 0 ? runtime / failures : runtime;

    // MTTR = Downtime / Failures
    const mttr = failures > 0 ? downtime / failures : 0;

    // Availability = MTBF / (MTBF + MTTR) * 100
    const availability = (mtbf / (mtbf + mttr)) * 100;

    // Recommended PM Interval (simple rule: MTBF * (Confidence/100))
    const pmInterval = mtbf * (confidence / 100);

    // แสดงผล
    mtbfOutput.innerText = mtbf.toFixed(2) + " hrs";
    mttrOutput.innerText = mttr.toFixed(2) + " hrs";
    availabilityOutput.innerText = availability.toFixed(1) + " %";
    pmIntervalOutput.innerText = pmInterval.toFixed(0) + " hrs";
  }

  function resetFields() {
    runtimeInput.value = 500;
    failuresInput.value = 5;
    downtimeInput.value = 20;
    intervalInput.value = 100;
    confidenceInput.value = 90;

    mtbfOutput.innerText = "-";
    mttrOutput.innerText = "-";
    availabilityOutput.innerText = "-";
    pmIntervalOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
