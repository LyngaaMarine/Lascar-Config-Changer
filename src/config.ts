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
  plugin: '#Plugin 02 analogue.xml',
  versUsr: '2.15',
  dateUsr: '03-10-16',
  fileUsr: 'Panel Pilot SGD 24-M420.cfg',
  type1: 'C',
  cal1Hi: { voltage: '03.33', value: '100', percent: '100%' },
  cal1Mi: { voltage: '00.10', value: '0', percent: '50%' },
  cal1Lo: { voltage: '00.00', value: '-100', percent: '0%' },
  cal2Hi: { voltage: '02.51', percent: '003' },
  cal2Lo: { voltage: '00.01', percent: '100' },
  label1: 'Pitch',
  scale1_0: '-100',
  scale1_50: '0',
  scale1_100: '100',
  s1_0col: 'ffff',
  s1_50col: 'ffff',
  s1_100col: 'ffff',
  l1col: 'ffff',
  a1col: 'f800 f800 f800 f800 f800 f800 f800 f800 f800 f800 ffff 3666 3666 3666 3666 3666 3666 3666 3666 3666 3666 #',
  k1col: '0000',
  p1col: 'ffff',
  blPer: '80',
  blInput: '1',
  buInput: '1',
  buLabel1: '',
  buLabel2: '',
  almTxt1: '',
  flash: '30'
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
    `AlmTxt1 ${config.almTxt1}`,
    `Flash ${config.flash}`
  ];
  return lines.join('\n') + '\n';
}

export function formatVoltage(voltage: number): string {
  // Format voltage as XX.XX (5 characters total with leading zeros)
  const absVoltage = Math.abs(voltage);
  const formatted = absVoltage.toFixed(2).padStart(5, '0');
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
