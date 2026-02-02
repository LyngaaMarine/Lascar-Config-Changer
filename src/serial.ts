// Web Serial API wrapper for device communication

export interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
}

declare global {
  interface Navigator {
    serial: Serial;
  }
  
  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }
  
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }
  
  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }
  
  interface SerialPort {
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    getInfo(): SerialPortInfo;
  }
  
  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }
}

export class WebSerialDevice {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readBuffer: string = '';
  private onDataCallback: ((data: string) => void) | null = null;
  private readLoopActive: boolean = false;

  isConnected(): boolean {
    return this.port !== null;
  }

  setOnDataCallback(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }

  async connect(baudRate: number = 9600): Promise<boolean> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate });
      
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }
      
      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
        this.startReadLoop();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  private async startReadLoop(): Promise<void> {
    if (!this.reader) return;
    
    this.readLoopActive = true;
    const decoder = new TextDecoder();
    
    try {
      while (this.readLoopActive) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        if (value) {
          const text = decoder.decode(value);
          this.readBuffer += text;
          
          if (this.onDataCallback) {
            this.onDataCallback(text);
          }
        }
      }
    } catch (error) {
      if (this.readLoopActive) {
        console.error('Read error:', error);
      }
    }
  }

  async send(data: string): Promise<void> {
    if (!this.writer) {
      throw new Error('Not connected');
    }
    
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(data));
  }

  async sendByte(byte: number): Promise<void> {
    if (!this.writer) {
      throw new Error('Not connected');
    }
    
    await this.writer.write(new Uint8Array([byte]));
  }

  async sendBytes(bytes: Uint8Array): Promise<void> {
    if (!this.writer) {
      throw new Error('Not connected');
    }
    
    await this.writer.write(bytes);
  }

  async waitFor(pattern: string, timeoutMs: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const index = this.readBuffer.indexOf(pattern);
        if (index !== -1) {
          clearInterval(checkInterval);
          const result = this.readBuffer.substring(0, index + pattern.length);
          this.readBuffer = this.readBuffer.substring(index + pattern.length);
          resolve(result);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for: ${pattern}`));
        }
      }, 50);
    });
  }

  async waitForLine(pattern: string, timeoutMs: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const lines = this.readBuffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].includes(pattern)) {
            clearInterval(checkInterval);
            const matchedLine = lines[i];
            // Remove all lines up to and including the matched line
            this.readBuffer = lines.slice(i + 1).join('\n');
            resolve(matchedLine);
            return;
          }
        }
        
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for line containing: ${pattern}`));
        }
      }, 50);
    });
  }

  clearBuffer(): void {
    this.readBuffer = '';
  }

  getBuffer(): string {
    return this.readBuffer;
  }

  async disconnect(): Promise<void> {
    this.readLoopActive = false;
    
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader.releaseLock();
      } catch { /* ignore */ }
      this.reader = null;
    }
    
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch { /* ignore */ }
      this.writer = null;
    }
    
    if (this.port) {
      try {
        await this.port.close();
      } catch { /* ignore */ }
      this.port = null;
    }
  }

  // Verify device by sending 'W' and waiting for 'SGD' response
  async verifyDevice(): Promise<boolean> {
    try {
      this.clearBuffer();
      await this.send('W');
      await this.waitFor('SGD', 2000);
      return true;
    } catch {
      return false;
    }
  }

  // Read voltage by sending 'x' and parsing the response
  async readVoltage(): Promise<{ rdg1: string; rdg2: string } | null> {
    try {
      this.clearBuffer();
      await this.send('x');
      
      // Wait for both readings
      const rdg1Line = await this.waitForLine('Rdg1', 3000);
      const rdg2Line = await this.waitForLine('Rdg2', 3000);
      
      return { rdg1: rdg1Line, rdg2: rdg2Line };
    } catch (error) {
      console.error('Failed to read voltage:', error);
      return null;
    }
  }
}

// XMODEM protocol implementation
export class XModem {
  private device: WebSerialDevice;
  
  // XMODEM constants
  private static readonly SOH = 0x01;  // Start of Header
  private static readonly EOT = 0x04;  // End of Transmission
  private static readonly ACK = 0x06;  // Acknowledge
  private static readonly NAK = 0x15;  // Negative Acknowledge
  private static readonly CAN = 0x18;  // Cancel
  private static readonly SUB = 0x1A;  // Substitute (padding)
  private static readonly PACKET_SIZE = 128;

  constructor(device: WebSerialDevice) {
    this.device = device;
  }

  private calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) & 0xFF;
    }
    return sum;
  }

  async send(data: string, onProgress?: (percent: number) => void): Promise<boolean> {
    const encoder = new TextEncoder();
    const fileData = encoder.encode(data);
    
    // Pad data to multiple of 128 bytes
    const paddedLength = Math.ceil(fileData.length / XModem.PACKET_SIZE) * XModem.PACKET_SIZE;
    const paddedData = new Uint8Array(paddedLength);
    paddedData.set(fileData);
    paddedData.fill(XModem.SUB, fileData.length);
    
    const totalPackets = paddedData.length / XModem.PACKET_SIZE;
    let packetNum = 1;
    let retries = 0;
    const maxRetries = 10;
    
    // Wait for initial NAK from receiver (indicates receiver is ready)
    try {
      this.device.clearBuffer();
      await this.waitForByte(XModem.NAK, 60000); // 60 second timeout for initial NAK
    } catch {
      throw new Error('Receiver not ready (no NAK received)');
    }
    
    while (packetNum <= totalPackets) {
      const offset = (packetNum - 1) * XModem.PACKET_SIZE;
      const packetData = paddedData.slice(offset, offset + XModem.PACKET_SIZE);
      
      // Build packet: SOH, packet#, ~packet#, 128 bytes data, checksum
      // Packet numbers wrap at 256 (use modulo 256)
      const wrappedPacketNum = packetNum & 0xFF;
      const packet = new Uint8Array(XModem.PACKET_SIZE + 4);
      packet[0] = XModem.SOH;
      packet[1] = wrappedPacketNum;
      packet[2] = (255 - wrappedPacketNum) & 0xFF;
      packet.set(packetData, 3);
      packet[XModem.PACKET_SIZE + 3] = this.calculateChecksum(packetData);
      
      await this.device.sendBytes(packet);
      
      try {
        const response = await this.waitForByte([XModem.ACK, XModem.NAK, XModem.CAN], 10000);
        
        if (response === XModem.ACK) {
          packetNum++;
          retries = 0;
          if (onProgress) {
            onProgress((packetNum / totalPackets) * 100);
          }
        } else if (response === XModem.NAK) {
          retries++;
          if (retries > maxRetries) {
            throw new Error('Too many NAKs, transfer failed');
          }
        } else if (response === XModem.CAN) {
          throw new Error('Transfer cancelled by receiver');
        }
      } catch {
        retries++;
        if (retries > maxRetries) {
          throw new Error('Timeout waiting for ACK/NAK');
        }
      }
    }
    
    // Send EOT
    await this.device.sendByte(XModem.EOT);
    
    try {
      await this.waitForByte(XModem.ACK, 10000);
    } catch {
      // Some receivers don't ACK the EOT
    }
    
    return true;
  }

  private async waitForByte(expected: number | number[], timeoutMs: number): Promise<number> {
    const expectedArray = Array.isArray(expected) ? expected : [expected];
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const buffer = this.device.getBuffer();
        for (let i = 0; i < buffer.length; i++) {
          const byte = buffer.charCodeAt(i);
          if (expectedArray.includes(byte)) {
            clearInterval(checkInterval);
            this.device.clearBuffer();
            resolve(byte);
            return;
          }
        }
        
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for expected byte'));
        }
      }, 50);
    });
  }
}
