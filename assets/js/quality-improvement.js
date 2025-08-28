document.addEventListener("DOMContentLoaded", () => {
  // Inputs
  const uslInput = document.getElementById("usl");
  const lslInput = document.getElementById("lsl");
  const meanInput = document.getElementById("mean");
  const stddevInput = document.getElementById("stddev");
  const unitsInput = document.getElementById("unitsProduced");
  const defectsInput = document.getElementById("defects");
  const oppInput = document.getElementById("opportunities");

  // Outputs
  const cpOutput = document.getElementById("cp");
  const cpkOutput = document.getElementById("cpk");
  const ppmOutput = document.getElementById("ppm");
  const sigmaOutput = document.getElementById("sigmaLevel");

  const calcBtn = document.getElementById("calc");
  const resetBtn = document.getElementById("reset");

  function calculate() {
    const usl = parseFloat(uslInput.value);
    const lsl = parseFloat(lslInput.value);
    const mean = parseFloat(meanInput.value);
    const stddev = parseFloat(stddevInput.value);
    const units = parseFloat(unitsInput.value);
    const defects = parseFloat(defectsInput.value);
    const opportunities = parseFloat(oppInput.value);

    if (
      isNaN(usl) || isNaN(lsl) || isNaN(mean) || isNaN(stddev) ||
      isNaN(units) || isNaN(defects) || isNaN(opportunities) ||
      stddev <= 0 || units <= 0 || opportunities <= 0
    ) {
      alert("⚠️ กรุณากรอกค่าตัวเลขให้ครบและถูกต้อง");
      return;
    }

    // Process Capability
    const cp = (usl - lsl) / (6 * stddev);
    const cpk = Math.min((usl - mean) / (3 * stddev), (mean - lsl) / (3 * stddev));

    // Defect Rate
    const ppm = (defects / units) * 1_000_000;
    const dpmo = (defects * 1_000_000) / (units * opportunities);

    // Six Sigma Level approximation
    // Z_upper = (USL - mean)/stddev
    // Z_lower = (mean - LSL)/stddev
    const zUpper = (usl - mean) / stddev;
    const zLower = (mean - lsl) / stddev;
    const z = Math.min(zUpper, zLower);
    const sigmaLevel = z - 1.5; // shift factor

    // Display results
    cpOutput.innerText = cp.toFixed(2);
    cpkOutput.innerText = cpk.toFixed(2);
    ppmOutput.innerText = `${ppm.toFixed(0)} PPM / ${dpmo.toFixed(0)} DPMO`;
    sigmaOutput.innerText = sigmaLevel.toFixed(2) + " σ";
  }

  function resetFields() {
    uslInput.value = 110;
    lslInput.value = 90;
    meanInput.value = 100;
    stddevInput.value = 5;
    unitsInput.value = 10000;
    defectsInput.value = 5;
    oppInput.value = 1;

    cpOutput.innerText = "-";
    cpkOutput.innerText = "-";
    ppmOutput.innerText = "-";
    sigmaOutput.innerText = "-";
  }

  calcBtn.addEventListener("click", calculate);
  resetBtn.addEventListener("click", resetFields);
});
