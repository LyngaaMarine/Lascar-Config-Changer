import type { ConfigData } from "./config";
import {
  defaultConfig,
  generateConfigFile,
  parseVoltageFromReading,
} from "./config";
import { WebSerialDevice, XModem } from "./serial";
import "./style.css";

// Constants
const DISCONNECT_DELAY_MS = 1000;

// Global state
let currentConfig: ConfigData = { ...defaultConfig };
let device: WebSerialDevice | null = null;

// Create the UI
function createUI(): void {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="container">
      <h1>Panel Pilot SGD Config Uploader</h1>
      
      <div class="section connection-section">
        <h2>Serial Connection</h2>
        <div class="button-group">
          <button id="connectBtn" class="btn btn-primary">Connect to Device</button>
          <button id="disconnectBtn" class="btn btn-secondary" disabled>Disconnect</button>
        </div>
        <div id="connectionStatus" class="status status-disconnected">Disconnected</div>
      </div>
      
      <div class="section voltage-section">
        <h2>Voltage Readings</h2>
        <button id="readVoltageBtn" class="btn btn-primary" disabled>Read Voltage (x)</button>
        <div class="voltage-display">
          <div class="voltage-card">
            <h3>Input 1</h3>
            <div id="rdg1Display" class="voltage-value">--</div>
          </div>
          <div class="voltage-card" id="input2Card">
            <h3>Input 2 (Brightness)</h3>
            <div id="rdg2Display" class="voltage-value">--</div>
          </div>
        </div>
        <div id="rawOutput" class="raw-output"></div>
      </div>
      
      <div class="section config-section">
        <h2>Configuration</h2>
        <form id="configForm">
          <div class="form-group toggle-group">
            <label class="toggle-label">
              <span>Backlight via Input 2</span>
              <input type="checkbox" id="blInputToggle" ${currentConfig.blInput === '1' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <small class="toggle-hint">When OFF, backlight is controlled via buttons</small>
          </div>
          
          <div class="form-group">
            <label for="label1">Label</label>
            <input type="text" id="label1" value="${currentConfig.label1}">
          </div>
          
          <h3>Pitch Calibration (Cal1)</h3>
          <div class="calibration-group">
            <div class="cal-row">
              <span class="cal-label">Max Pitch (Cal1Hi)</span>
              <input type="number" step="0.01" id="cal1HiVoltage" value="${parseFloat(currentConfig.cal1Hi.voltage)}" placeholder="Voltage">
              <input type="number" id="cal1HiValue" value="${parseInt(currentConfig.cal1Hi.value)}" placeholder="Value">
              <input type="number" id="cal1HiPercent" value="${parseInt(currentConfig.cal1Hi.percent)}" placeholder="Percent">
              <button type="button" id="setCal1HiBtn" class="btn btn-small" disabled>Set from Input 1</button>
            </div>
            <div class="cal-row">
              <span class="cal-label">Zero Pitch (Cal1Mi)</span>
              <input type="number" step="0.01" id="cal1MiVoltage" value="${parseFloat(currentConfig.cal1Mi.voltage)}" placeholder="Voltage">
              <input type="number" id="cal1MiValue" value="${parseInt(currentConfig.cal1Mi.value)}" placeholder="Value">
              <input type="number" id="cal1MiPercent" value="${parseInt(currentConfig.cal1Mi.percent)}" placeholder="Percent">
              <button type="button" id="setCal1MiBtn" class="btn btn-small" disabled>Set from Input 1</button>
            </div>
            <div class="cal-row">
              <span class="cal-label">Min Pitch (Cal1Lo)</span>
              <input type="number" step="0.01" id="cal1LoVoltage" value="${parseFloat(currentConfig.cal1Lo.voltage)}" placeholder="Voltage">
              <input type="number" id="cal1LoValue" value="${parseInt(currentConfig.cal1Lo.value)}" placeholder="Value">
              <input type="number" id="cal1LoPercent" value="${parseInt(currentConfig.cal1Lo.percent)}" placeholder="Percent">
              <button type="button" id="setCal1LoBtn" class="btn btn-small" disabled>Set from Input 1</button>
            </div>
          </div>
          
          <div id="cal2Section">
            <h3>Brightness Calibration (Cal2)</h3>
            <div class="calibration-group">
              <div class="cal-row">
                <span class="cal-label">Brightness High (Cal2Hi)</span>
                <input type="number" step="0.01" id="cal2HiVoltage" value="${parseFloat(currentConfig.cal2Hi.voltage)}" placeholder="Voltage">
                <input type="number" id="cal2HiPercent" value="${parseInt(currentConfig.cal2Hi.percent)}" placeholder="Percent">
                <button type="button" id="setCal2HiBtn" class="btn btn-small" disabled>Set from Input 2</button>
              </div>
              <div class="cal-row">
                <span class="cal-label">Brightness Low (Cal2Lo)</span>
                <input type="number" step="0.01" id="cal2LoVoltage" value="${parseFloat(currentConfig.cal2Lo.voltage)}" placeholder="Voltage">
                <input type="number" id="cal2LoPercent" value="${parseInt(currentConfig.cal2Lo.percent)}" placeholder="Percent">
                <button type="button" id="setCal2LoBtn" class="btn btn-small" disabled>Set from Input 2</button>
              </div>
            </div>
          </div>
          
          <h3>Scale Settings</h3>
          <div class="form-group-row">
            <div class="form-group">
              <label for="scale1_0">Scale 0%</label>
              <input type="text" id="scale1_0" value="${currentConfig.scale1_0}">
            </div>
            <div class="form-group">
              <label for="scale1_50">Scale 50%</label>
              <input type="text" id="scale1_50" value="${currentConfig.scale1_50}">
            </div>
            <div class="form-group">
              <label for="scale1_100">Scale 100%</label>
              <input type="text" id="scale1_100" value="${currentConfig.scale1_100}">
            </div>
          </div>
          
          <h3>Color Settings (Hex)</h3>
          <div class="form-group-row">
            <div class="form-group">
              <label for="s1_0col">Color 0%</label>
              <input type="text" id="s1_0col" value="${currentConfig.s1_0col}">
            </div>
            <div class="form-group">
              <label for="s1_50col">Color 50%</label>
              <input type="text" id="s1_50col" value="${currentConfig.s1_50col}">
            </div>
            <div class="form-group">
              <label for="s1_100col">Color 100%</label>
              <input type="text" id="s1_100col" value="${currentConfig.s1_100col}">
            </div>
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label for="l1col">Label Color</label>
              <input type="text" id="l1col" value="${currentConfig.l1col}">
            </div>
            <div class="form-group">
              <label for="k1col">K1 Color</label>
              <input type="text" id="k1col" value="${currentConfig.k1col}">
            </div>
            <div class="form-group">
              <label for="p1col">P1 Color</label>
              <input type="text" id="p1col" value="${currentConfig.p1col}">
            </div>
          </div>
          <div class="form-group">
            <label for="a1col">A1 Color (Arc)</label>
            <input type="text" id="a1col" value="${currentConfig.a1col}">
          </div>
          
          <h3>Display Settings</h3>
          <div class="form-group toggle-group">
            <label class="toggle-label">
              <span>Enable Buttons</span>
              <input type="checkbox" id="buInputToggle" ${currentConfig.buInput === '1' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="form-group-row" id="buttonLabelsSection">
            <div class="form-group">
              <label for="buLabel1">Button Label 1</label>
              <input type="text" id="buLabel1" value="${currentConfig.buLabel1}">
            </div>
            <div class="form-group">
              <label for="buLabel2">Button Label 2</label>
              <input type="text" id="buLabel2" value="${currentConfig.buLabel2}">
            </div>
          </div>
          
          <div class="form-group toggle-group">
            <label class="toggle-label">
              <span>Enable Alarm Text</span>
              <input type="checkbox" id="almTxtToggle" ${currentConfig.almTxt1 && currentConfig.almTxt1.trim() !== '' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="form-group" id="almTxtSection">
            <label for="almTxt1">Alarm Text</label>
            <input type="text" id="almTxt1" value="${currentConfig.almTxt1}">
          </div>
        </form>
      </div>
      
      <div class="section upload-section">
        <h2>Upload Configuration</h2>
        <div class="button-group">
          <button id="previewBtn" class="btn btn-secondary">Preview Config File</button>
          <button id="downloadBtn" class="btn btn-secondary">Download Config File</button>
          <button id="uploadBtn" class="btn btn-primary" disabled>Upload to Device (XMODEM-1K)</button>
        </div>
        <div id="uploadProgress" class="progress-bar" style="display: none;">
          <div id="progressFill" class="progress-fill"></div>
        </div>
        <div id="uploadStatus" class="status"></div>
      </div>
      
      <div id="previewModal" class="modal" style="display: none;">
        <div class="modal-content">
          <h3>Configuration File Preview</h3>
          <pre id="configPreview"></pre>
          <button id="closePreviewBtn" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;

  setupEventListeners();
}

function updateConfigFromForm(): void {
  // Version, Date, and File Name are fixed values from defaultConfig
  currentConfig.label1 = getInputValue("label1");

  // Cal1 inputs - format voltage as XX.XX, value as integer, percent as X%
  currentConfig.cal1Hi = {
    voltage: formatVoltageForConfig(getInputValue("cal1HiVoltage")),
    value: getInputValue("cal1HiValue"),
    percent: formatPercentForCal1(getInputValue("cal1HiPercent")),
  };
  currentConfig.cal1Mi = {
    voltage: formatVoltageForConfig(getInputValue("cal1MiVoltage")),
    value: getInputValue("cal1MiValue"),
    percent: formatPercentForCal1(getInputValue("cal1MiPercent")),
  };
  currentConfig.cal1Lo = {
    voltage: formatVoltageForConfig(getInputValue("cal1LoVoltage")),
    value: getInputValue("cal1LoValue"),
    percent: formatPercentForCal1(getInputValue("cal1LoPercent")),
  };

  // Cal2 inputs - format voltage as XX.XX, percent as 3-digit number
  currentConfig.cal2Hi = {
    voltage: formatVoltageForConfig(getInputValue("cal2HiVoltage")),
    percent: formatPercentForCal2(getInputValue("cal2HiPercent")),
  };
  currentConfig.cal2Lo = {
    voltage: formatVoltageForConfig(getInputValue("cal2LoVoltage")),
    percent: formatPercentForCal2(getInputValue("cal2LoPercent")),
  };

  currentConfig.scale1_0 = getInputValue("scale1_0");
  currentConfig.scale1_50 = getInputValue("scale1_50");
  currentConfig.scale1_100 = getInputValue("scale1_100");

  currentConfig.s1_0col = getInputValue("s1_0col");
  currentConfig.s1_50col = getInputValue("s1_50col");
  currentConfig.s1_100col = getInputValue("s1_100col");
  currentConfig.l1col = getInputValue("l1col");
  currentConfig.a1col = getInputValue("a1col");
  currentConfig.k1col = getInputValue("k1col");
  currentConfig.p1col = getInputValue("p1col");

  // BLInput toggle: '1' for input 2, '0' for buttons
  const blInputToggle = document.getElementById("blInputToggle") as HTMLInputElement;
  currentConfig.blInput = blInputToggle.checked ? '1' : '0';

  // BUInput toggle: '0' when buttons enabled (checked), '1' when disabled (inverted logic)
  const buInputToggle = document.getElementById("buInputToggle") as HTMLInputElement;
  currentConfig.buInput = buInputToggle.checked ? '0' : '1';
  
  // Only get button labels if buttons are enabled
  if (buInputToggle.checked) {
    currentConfig.buLabel1 = getInputValue("buLabel1");
    currentConfig.buLabel2 = getInputValue("buLabel2");
  } else {
    currentConfig.buLabel1 = '';
    currentConfig.buLabel2 = '';
  }

  // Alarm text toggle: if disabled, use empty string (just CR LF in output)
  const almTxtToggle = document.getElementById("almTxtToggle") as HTMLInputElement;
  if (almTxtToggle.checked) {
    currentConfig.almTxt1 = getInputValue("almTxt1");
  } else {
    currentConfig.almTxt1 = '';
  }
}

// Format voltage as XX.XX (5 characters with leading zeros)
function formatVoltageForConfig(value: string): string {
  const num = parseFloat(value) || 0;
  // Ensure we get leading zeros for values < 10 (e.g., 3.33 -> 03.33)
  const fixed = num.toFixed(2);
  return fixed.padStart(5, '0');
}

// Format percent for Cal1 as X%
function formatPercentForCal1(value: string): string {
  const num = parseInt(value, 10) || 0;
  return `${num}%`;
}

// Format percent for Cal2 as 3-digit number (e.g., 003, 100)
function formatPercentForCal2(value: string): string {
  const num = parseInt(value, 10) || 0;
  return num.toString().padStart(3, '0');
}

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value || "";
}

function setConnectionStatus(connected: boolean): void {
  const statusEl = document.getElementById("connectionStatus")!;
  const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
  const disconnectBtn = document.getElementById(
    "disconnectBtn",
  ) as HTMLButtonElement;
  const readVoltageBtn = document.getElementById(
    "readVoltageBtn",
  ) as HTMLButtonElement;
  const uploadBtn = document.getElementById("uploadBtn") as HTMLButtonElement;

  const calButtons = [
    "setCal1HiBtn",
    "setCal1MiBtn",
    "setCal1LoBtn",
    "setCal2HiBtn",
    "setCal2LoBtn",
  ];

  if (connected) {
    statusEl.textContent = "Connected";
    statusEl.className = "status status-connected";
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    readVoltageBtn.disabled = false;
    uploadBtn.disabled = false;
    calButtons.forEach((id) => {
      (document.getElementById(id) as HTMLButtonElement).disabled = false;
    });
  } else {
    statusEl.textContent = "Disconnected";
    statusEl.className = "status status-disconnected";
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    readVoltageBtn.disabled = true;
    uploadBtn.disabled = true;
    calButtons.forEach((id) => {
      (document.getElementById(id) as HTMLButtonElement).disabled = true;
    });
  }
}

let lastRdg1Voltage: string | null = null;
let lastRdg2Voltage: string | null = null;

function setupEventListeners(): void {
  // Connect button
  document.getElementById("connectBtn")!.addEventListener("click", async () => {
    try {
      device = new WebSerialDevice();

      // Set up data callback for raw output
      device.setOnDataCallback((data) => {
        const rawOutput = document.getElementById("rawOutput")!;
        rawOutput.textContent += data;
        rawOutput.scrollTop = rawOutput.scrollHeight;
      });

      await device.connect(9600);

      // Verify device
      const verified = await device.verifyDevice();
      if (verified) {
        setConnectionStatus(true);
        showStatus("uploadStatus", "Device connected and verified!", "success");
      } else {
        await device.disconnect();
        device = null;
        showStatus(
          "uploadStatus",
          "Device verification failed. Not a compatible device.",
          "error",
        );
      }
    } catch (error) {
      showStatus("uploadStatus", `Connection failed: ${error}`, "error");
    }
  });

  // Disconnect button
  document
    .getElementById("disconnectBtn")!
    .addEventListener("click", async () => {
      if (device) {
        await device.disconnect();
        device = null;
      }
      setConnectionStatus(false);
      showStatus("uploadStatus", "Disconnected", "info");
    });

  // Read voltage button
  document
    .getElementById("readVoltageBtn")!
    .addEventListener("click", async () => {
      if (!device) return;

      const rdg1Display = document.getElementById("rdg1Display")!;
      const rdg2Display = document.getElementById("rdg2Display")!;

      rdg1Display.textContent = "Reading...";
      rdg2Display.textContent = "Reading...";

      const readings = await device.readVoltage();
      if (readings) {
        rdg1Display.innerHTML = formatVoltageDisplay(readings.rdg1);
        rdg2Display.innerHTML = formatVoltageDisplay(readings.rdg2);

        // Store parsed voltages for calibration buttons
        lastRdg1Voltage = parseVoltageFromReading(readings.rdg1);
        lastRdg2Voltage = parseVoltageFromReading(readings.rdg2);
      } else {
        rdg1Display.textContent = "Error";
        rdg2Display.textContent = "Error";
      }
    });

  // Helper function to read voltage and update display
  async function readAndGetVoltage(): Promise<{ rdg1: string | null; rdg2: string | null }> {
    if (!device) return { rdg1: null, rdg2: null };

    const rdg1Display = document.getElementById("rdg1Display")!;
    const rdg2Display = document.getElementById("rdg2Display")!;

    rdg1Display.textContent = "Reading...";
    rdg2Display.textContent = "Reading...";

    const readings = await device.readVoltage();
    if (readings) {
      rdg1Display.innerHTML = formatVoltageDisplay(readings.rdg1);
      rdg2Display.innerHTML = formatVoltageDisplay(readings.rdg2);

      lastRdg1Voltage = parseVoltageFromReading(readings.rdg1);
      lastRdg2Voltage = parseVoltageFromReading(readings.rdg2);
      
      return { rdg1: lastRdg1Voltage, rdg2: lastRdg2Voltage };
    } else {
      rdg1Display.textContent = "Error";
      rdg2Display.textContent = "Error";
      return { rdg1: null, rdg2: null };
    }
  }

  // Calibration buttons - read from device when pressed
  document.getElementById("setCal1HiBtn")!.addEventListener("click", async () => {
    const { rdg1 } = await readAndGetVoltage();
    if (rdg1) {
      (document.getElementById("cal1HiVoltage") as HTMLInputElement).value = rdg1;
    }
  });

  document.getElementById("setCal1MiBtn")!.addEventListener("click", async () => {
    const { rdg1 } = await readAndGetVoltage();
    if (rdg1) {
      (document.getElementById("cal1MiVoltage") as HTMLInputElement).value = rdg1;
    }
  });

  document.getElementById("setCal1LoBtn")!.addEventListener("click", async () => {
    const { rdg1 } = await readAndGetVoltage();
    if (rdg1) {
      (document.getElementById("cal1LoVoltage") as HTMLInputElement).value = rdg1;
    }
  });

  document.getElementById("setCal2HiBtn")!.addEventListener("click", async () => {
    const { rdg2 } = await readAndGetVoltage();
    if (rdg2) {
      (document.getElementById("cal2HiVoltage") as HTMLInputElement).value = rdg2;
    }
  });

  document.getElementById("setCal2LoBtn")!.addEventListener("click", async () => {
    const { rdg2 } = await readAndGetVoltage();
    if (rdg2) {
      (document.getElementById("cal2LoVoltage") as HTMLInputElement).value = rdg2;
    }
  });

  // Preview button
  document.getElementById("previewBtn")!.addEventListener("click", () => {
    updateConfigFromForm();
    const configContent = generateConfigFile(currentConfig);
    document.getElementById("configPreview")!.textContent = configContent;
    document.getElementById("previewModal")!.style.display = "flex";
  });

  // Close preview button
  document.getElementById("closePreviewBtn")!.addEventListener("click", () => {
    document.getElementById("previewModal")!.style.display = "none";
  });

  // Download button
  document.getElementById("downloadBtn")!.addEventListener("click", () => {
    updateConfigFromForm();
    const configContent = generateConfigFile(currentConfig);
    const blob = new Blob([configContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Configuration.cfg";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Upload button
  document.getElementById("uploadBtn")!.addEventListener("click", async () => {
    if (!device) return;

    updateConfigFromForm();
    const configContent = generateConfigFile(currentConfig);

    const progressBar = document.getElementById("uploadProgress")!;
    const progressFill = document.getElementById("progressFill")!;

    progressBar.style.display = "block";
    progressFill.style.width = "0%";

    try {
      showStatus("uploadStatus", "Initiating XMODEM transfer...", "info");

      // Send 's' to start config mode
      device.clearBuffer();
      await device.send("s");

      // Clear buffer to ensure XModem class can detect the 'C' command properly
      device.clearBuffer();
      await device.waitFor("C", 5000);

      showStatus(
        "uploadStatus",
        "Sending configuration via XMODEM-1K...",
        "info",
      );

      // Send file via XMODEM-1K (XModem class will wait for 'C' from receiver)
      const xmodem = new XModem(device);
      await xmodem.send(configContent, (percent) => {
        progressFill.style.width = `${percent}%`;
      });

      // Wait a moment then send 'm' to complete
      await new Promise((resolve) => setTimeout(resolve, DISCONNECT_DELAY_MS));
      await device.send("m");

      progressFill.style.width = "100%";
      showStatus(
        "uploadStatus",
        "Configuration uploaded successfully!",
        "success",
      );

      // The 'm' command causes the device to close the connection
      // Disconnect cleanly on our side after a short delay
      await new Promise((resolve) => setTimeout(resolve, DISCONNECT_DELAY_MS));
      if (device) {
        await device.disconnect();
        device = null;
      }
      setConnectionStatus(false);
      showStatus("uploadStatus", "Configuration uploaded successfully! Device disconnected.", "success");

      // Prompt user to reconnect after 1 second
      setTimeout(() => {
        showStatus("uploadStatus", "Ready to connect again. Click 'Connect to Device' to reconnect.", "info");
        // Trigger click on connect button to prompt for device selection
        document.getElementById("connectBtn")?.click();
      }, DISCONNECT_DELAY_MS);
    } catch (error) {
      showStatus("uploadStatus", `Upload failed: ${error}`, "error");
    }

    setTimeout(() => {
      progressBar.style.display = "none";
    }, 3000);
  });

  // Close modal when clicking outside
  document.getElementById("previewModal")!.addEventListener("click", (e) => {
    if (e.target === document.getElementById("previewModal")) {
      document.getElementById("previewModal")!.style.display = "none";
    }
  });

  // Toggle event listeners for dynamic UI updates
  const blInputToggle = document.getElementById("blInputToggle") as HTMLInputElement;
  const buInputToggle = document.getElementById("buInputToggle") as HTMLInputElement;
  const almTxtToggle = document.getElementById("almTxtToggle") as HTMLInputElement;

  // Function to update visibility based on toggle states
  function updateToggleVisibility(): void {
    // BLInput toggle - show/hide Cal2 section and Input 2 card
    const cal2Section = document.getElementById("cal2Section")!;
    const input2Card = document.getElementById("input2Card")!;
    if (blInputToggle.checked) {
      cal2Section.style.display = "block";
      input2Card.style.display = "block";
    } else {
      cal2Section.style.display = "none";
      input2Card.style.display = "none";
    }

    // BUInput toggle - show/hide button labels section
    const buttonLabelsSection = document.getElementById("buttonLabelsSection")!;
    if (buInputToggle.checked) {
      buttonLabelsSection.style.display = "grid";
    } else {
      buttonLabelsSection.style.display = "none";
    }

    // Alarm text toggle - show/hide alarm text input
    const almTxtSection = document.getElementById("almTxtSection")!;
    if (almTxtToggle.checked) {
      almTxtSection.style.display = "block";
    } else {
      almTxtSection.style.display = "none";
    }
  }

  // Set up toggle event listeners
  blInputToggle.addEventListener("change", updateToggleVisibility);
  buInputToggle.addEventListener("change", updateToggleVisibility);
  almTxtToggle.addEventListener("change", updateToggleVisibility);

  // Initialize visibility based on current toggle states
  updateToggleVisibility();
}

function formatVoltageDisplay(reading: string): string {
  const voltage = parseVoltageFromReading(reading);
  if (voltage) {
    return `<span class="voltage-number">${voltage} V</span><br><small>${reading}</small>`;
  }
  return reading;
}

function showStatus(
  elementId: string,
  message: string,
  type: "success" | "error" | "info",
): void {
  const el = document.getElementById(elementId)!;
  el.textContent = message;
  el.className = `status status-${type}`;
}

// Initialize the app
createUI();
