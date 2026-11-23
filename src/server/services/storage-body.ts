/** Native image processors can return shared memory that production fetch rejects. */
export function storageBody(data: Uint8Array): ArrayBuffer {
  return Uint8Array.from(data).buffer;
}
