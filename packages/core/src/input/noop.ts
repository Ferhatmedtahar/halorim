import type { InputHandlers, InputSource } from '../types.js';

export class NoopInput implements InputSource {
  public subscribe(_handlers: InputHandlers): () => void {
    return () => {};
  }
}
