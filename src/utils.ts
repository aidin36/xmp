/**
 * @internal
 */
// TODO: Make sure it decodes from UTF-8
export const binArray2String = (array: Uint8Array) => array.reduce((acc, byte) => acc + String.fromCharCode(byte), '')

/**
 * @internal
 *
 * Converts two bytes in big-endian format to an "unsigned 16-bit integer".
 */
export const numberFromBytes = (byte1: number, byte2: number): number => (byte1 << 8) | byte2
