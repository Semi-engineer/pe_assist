// qr.js

document.addEventListener("DOMContentLoaded", () => {
  const producedInput = document.getElementById("produced");
  const defectsInput = document.getElementById("defects");
  const runtimeInput = document.getElementById("runtime");
  const failuresInput = document.getElementById("failures");
  const downtimeInput = document.getElementById("downtime");

  const ppmOutput = document.getElementById("ppm");
  const yieldOutput = document.getElementById("yield");
  const mtbfOutput = document.getElementById("mtbf");
  const mttrOutput = document.getElementById("mttr");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  // ฟังก์ชันคำนวณ
  function calculate() {
    const produced = parseFloat(producedInput.value);
    const defects = parseFloat(defectsInput.value);
    const runtime = parseFloat(runtimeInput.value);
    const failures = parseFloat(failuresInput.value);
    const downtime = parseFloat(downtimeInput.value);

    // ตรวจสอบค่าที่กรอก
    if (
      isNaN(produced) || isNaN(defects) || isNaN(runtime) ||
      isNaN(failures) || isNaN(downtime) ||
      produced <= 0 || runtime <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // Defect Rate (PPM)
    const ppm = (defects / produced) * 1_000_000;

    // Yield (%)
    const yieldPercent = ((produced - defects) / produced) * 100;

    // MTBF (hrs)
    const mtbf = failures > 0 ? runtime / failures : runtime;

    // MTTR (hrs)
    const mttr = failures > 0 ? downtime / failures : 0;

    // แสดงผล
    ppmOutput.innerText = ppm.toFixed(0) + " PPM";
    yieldOutput.innerText = yieldPercent.toFixed(2) + " %";
    mtbfOutput.innerText = mtbf.toFixed(2) + " hrs";
    mttrOutput.innerText = mttr.toFixed(2) + " hrs";
  }

  // ฟังก์ชันรีเซ็ต
  function resetFields() {
    producedInput.value = 1000;
    defectsInput.value = 50;
    runtimeInput.value = 40;
    failuresInput.value = 2;
    downtimeInput.value = 5;

    ppmOutput.innerText = "-";
    yieldOutput.innerText = "-";
    mtbfOutput.innerText = "-";
    mttrOutput.innerText = "-";
  }

  // Event listener
  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
