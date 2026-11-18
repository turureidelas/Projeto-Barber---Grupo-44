import { requireIntegerInRange } from '../shared/guards';

/** Whole percentage from 0 to 100 (e.g. a professional's commission). */
export class Percentage {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static of(value: number): Percentage {
    return new Percentage(requireIntegerInRange('percentage', value, 0, 100));
  }

  equals(other: Percentage): boolean {
    return this.value === other.value;
  }
}
