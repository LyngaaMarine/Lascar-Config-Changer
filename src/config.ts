// Configuration file structure for Panel Pilot SGD
export interface ConfigData {
  plugin: string;
  versUsr: string;
  dateUsr: string;
  fileUsr: string;
  type1: string;
  cal1Hi: { voltage: string; value: string; percent: string };
  cal1Mi: { voltage: string; value: string; percent: string };
  cal1Lo: { voltage: string; value: string; percent: string };
  cal2Hi: { voltage: string; percent: string };
  cal2Lo: { voltage: string; percent: string };
  label1: string;
  scale1_0: string;
  scale1_50: string;
  scale1_100: string;
  s1_0col: string;
  s1_50col: string;
  s1_100col: string;
  l1col: string;
  a1col: string;
  k1col: string;
  p1col: string;
  blPer: string;
  blInput: string;
  buInput: string;
  buLabel1: string;
  buLabel2: string;
  almTxt1: string;
  flash: string;
}

export const defaultConfig: ConfigData = {
  plugin: "#Plugin 02 analogue.xml",
  versUsr: "2.15",
  dateUsr: "03-10-16",
  fileUsr: "Panel Pilot SGD 24-M420.cfg",
  type1: "C",
  cal1Hi: { voltage: "00.00", value: "100", percent: "100%" },
  cal1Mi: { voltage: "05.00", value: "0", percent: "50%" },
  cal1Lo: { voltage: "10.00", value: "-100", percent: "0%" },
  cal2Hi: { voltage: "08.00", percent: "003" },
  cal2Lo: { voltage: "00.00", percent: "100" },
  label1: "Pitch",
  scale1_0: "-100",
  scale1_50: "0",
  scale1_100: "100",
  s1_0col: "ffff",
  s1_50col: "ffff",
  s1_100col: "ffff",
  l1col: "ffff",
  a1col:
    "f800 f800 f800 f800 f800 f800 f800 f800 f800 f800 ffff 3666 3666 3666 3666 3666 3666 3666 3666 3666 3666 #",
  k1col: "0000",
  p1col: "ffff",
  blPer: "80",
  blInput: "1",
  buInput: "1",
  buLabel1: "",
  buLabel2: "",
  almTxt1: "",
  flash: "30",
};

export function generateConfigFile(config: ConfigData): string {
  const lines = [
    config.plugin,
    `Vers_usr ${config.versUsr}`,
    `Date_usr ${config.dateUsr}`,
    `File_usr ${config.fileUsr}`,
    `Type1 ${config.type1}`,
    `Cal1Hi ${config.cal1Hi.voltage} ${config.cal1Hi.value} ${config.cal1Hi.percent}`,
    `Cal1Mi ${config.cal1Mi.voltage} ${config.cal1Mi.value} ${config.cal1Mi.percent}`,
    `Cal1Lo ${config.cal1Lo.voltage} ${config.cal1Lo.value} ${config.cal1Lo.percent}`,
    `Cal2Hi ${config.cal2Hi.voltage} ${config.cal2Hi.percent}`,
    `Cal2Lo ${config.cal2Lo.voltage} ${config.cal2Lo.percent}`,
    `Label1 ${config.label1}`,
    `Scale1_0 ${config.scale1_0}`,
    `Scale1_50 ${config.scale1_50}`,
    `Scale1_100 ${config.scale1_100}`,
    `S1_0col ${config.s1_0col}`,
    `S1_50col ${config.s1_50col}`,
    `S1_100col ${config.s1_100col}`,
    `L1col ${config.l1col}`,
    `A1col ${config.a1col}`,
    `K1col ${config.k1col}`,
    `P1col ${config.p1col}`,
    `BLper ${config.blPer}`,
    `BLInput ${config.blInput}`,
    `BuInput ${config.buInput}`,
    `BuLabel1 ${config.buLabel1}`,
    `BuLabel2 ${config.buLabel2}`,
    // AlmTxt1 should have no space after it when empty
    config.almTxt1 ? `AlmTxt1 ${config.almTxt1}` : "AlmTxt1",
    `Flash ${config.flash}`,
  ];

  // Join lines with CR LF (Windows-style line endings required by device)
  let content = lines.join("\r\n") + "\r\n";

  // Pad to 1024 bytes with spaces (required for XMODEM-1K transfer)
  const targetSize = 1024;
  if (content.length < targetSize) {
    content = content.padEnd(targetSize, " ");
  } else if (content.length > targetSize) {
    console.warn(
      `Config file size (${content.length} bytes) exceeds ${targetSize} bytes limit`,
    );
  }

  return content;
}

export function formatVoltage(voltage: number): string {
  // Format voltage as XX.XX (5 characters total with leading zeros)
  const absVoltage = Math.abs(voltage);
  const formatted = absVoltage.toFixed(2).padStart(5, "0");
  return formatted;
}

export function parseVoltageFromReading(reading: string): string | null {
  // Parse voltage from device reading like "Rdg1: ADC = -19428 Digi = 0.00 V"
  const match = reading.match(/Digi\s*=\s*(-?\d+\.?\d*)\s*V/);
  if (match) {
    const voltage = parseFloat(match[1]);
    return formatVoltage(voltage);
  }
  return null;
}

// Convert RGB565 hex (4 chars like "f800") to HTML color (#RRGGBB)
export function rgb565ToHtml(rgb565: string): string {
  const value = parseInt(rgb565, 16);
  // RGB565: RRRRRGGGGGGBBBBB
  const r5 = (value >> 11) & 0x1f;
  const g6 = (value >> 5) & 0x3f;
  const b5 = value & 0x1f;
  // Expand to 8-bit by shifting and filling low bits
  const r8 = (r5 << 3) | (r5 >> 2);
  const g8 = (g6 << 2) | (g6 >> 4);
  const b8 = (b5 << 3) | (b5 >> 2);
  return `#${r8.toString(16).padStart(2, "0")}${g8.toString(16).padStart(2, "0")}${b8.toString(16).padStart(2, "0")}`;
}

// Convert HTML color (#RRGGBB) to RGB565 hex (4 chars like "f800")
export function htmlToRgb565(htmlColor: string): string {
  const hex = htmlColor.replace("#", "");
  const r8 = parseInt(hex.substring(0, 2), 16);
  const g8 = parseInt(hex.substring(2, 4), 16);
  const b8 = parseInt(hex.substring(4, 6), 16);
  // Convert to 5-6-5 bit
  const r5 = r8 >> 3;
  const g6 = g8 >> 2;
  const b5 = b8 >> 3;
  const rgb565 = (r5 << 11) | (g6 << 5) | b5;
  return rgb565.toString(16).padStart(4, "0");
}

// Parse a1col string into array of RGB565 colors (always returns 21 colors)
export function parseA1col(a1col: string): string[] {
  // Format: "f800 f800 f800 ... #" - space-separated colors ending with #
  const colors = a1col
    .replace("#", "")
    .trim()
    .split(/\s+/)
    .filter((c) => c.length > 0);
  // Ensure we always have exactly 21 colors, pad with white if needed
  while (colors.length < 21) {
    colors.push("ffff");
  }
  return colors.slice(0, 21);
}

// Format array of RGB565 colors into a1col string
export function formatA1col(colors: string[]): string {
  // Ensure we have exactly 21 colors, pad with white if needed
  const paddedColors = [...colors];
  while (paddedColors.length < 21) {
    paddedColors.push("ffff");
  }
  return paddedColors.slice(0, 21).join(" ") + " #";
}

// Parse a config file string into ConfigData
export function parseConfigFile(content: string): ConfigData {
  const config = { ...defaultConfig };
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      // Plugin line starts with #
      if (trimmedLine.startsWith("#Plugin")) {
        config.plugin = trimmedLine;
      }
      continue;
    }

    // Parse key-value pairs
    const spaceIndex = trimmedLine.indexOf(" ");
    if (spaceIndex === -1) {
      // Handle keys with no value (like empty AlmTxt1)
      const key = trimmedLine.toLowerCase();
      if (key === "almtxt1") {
        config.almTxt1 = "";
      }
      continue;
    }

    const key = trimmedLine.substring(0, spaceIndex).toLowerCase();
    const value = trimmedLine.substring(spaceIndex + 1).trim();

    switch (key) {
      case "vers_usr":
        config.versUsr = value;
        break;
      case "date_usr":
        config.dateUsr = value;
        break;
      case "file_usr":
        config.fileUsr = value;
        break;
      case "type1":
        config.type1 = value;
        break;
      case "cal1hi": {
        const parts = value.split(/\s+/);
        config.cal1Hi = {
          voltage: parts[0] || "00.00",
          value: parts[1] || "0",
          percent: parts[2] || "0%",
        };
        break;
      }
      case "cal1mi": {
        const parts = value.split(/\s+/);
        config.cal1Mi = {
          voltage: parts[0] || "00.00",
          value: parts[1] || "0",
          percent: parts[2] || "0%",
        };
        break;
      }
      case "cal1lo": {
        const parts = value.split(/\s+/);
        config.cal1Lo = {
          voltage: parts[0] || "00.00",
          value: parts[1] || "0",
          percent: parts[2] || "0%",
        };
        break;
      }
      case "cal2hi": {
        const parts = value.split(/\s+/);
        config.cal2Hi = {
          voltage: parts[0] || "00.00",
          percent: parts[1] || "000",
        };
        break;
      }
      case "cal2lo": {
        const parts = value.split(/\s+/);
        config.cal2Lo = {
          voltage: parts[0] || "00.00",
          percent: parts[1] || "000",
        };
        break;
      }
      case "label1":
        config.label1 = value;
        break;
      case "scale1_0":
        config.scale1_0 = value;
        break;
      case "scale1_50":
        config.scale1_50 = value;
        break;
      case "scale1_100":
        config.scale1_100 = value;
        break;
      case "s1_0col":
        config.s1_0col = value;
        break;
      case "s1_50col":
        config.s1_50col = value;
        break;
      case "s1_100col":
        config.s1_100col = value;
        break;
      case "l1col":
        config.l1col = value;
        break;
      case "a1col":
        config.a1col = value;
        break;
      case "k1col":
        config.k1col = value;
        break;
      case "p1col":
        config.p1col = value;
        break;
      case "blper":
        config.blPer = value;
        break;
      case "blinput":
        config.blInput = value;
        break;
      case "buinput":
        config.buInput = value;
        break;
      case "bulabel1":
        config.buLabel1 = value;
        break;
      case "bulabel2":
        config.buLabel2 = value;
        break;
      case "almtxt1":
        config.almTxt1 = value;
        break;
      case "flash":
        config.flash = value;
        break;
    }
  }

  return config;
}
