export function hexToBytes(hex: string): Uint8Array {
    let cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) cleanHex = "0" + cleanHex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  