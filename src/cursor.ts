import type { NonFunctionKeys } from "utility-types";
import Database from "./database";

type StateProps = Pick<
  typeof Cursor.prototype,
  NonFunctionKeys<typeof Cursor.prototype>
>;

/** Keeps track of current position in table */
export default class Cursor {
  #isTableEnd: boolean;
  #hasAdvanced: boolean;
  #currentRow: number;
  #state: StateProps;

  constructor(isTableEnd: boolean, currentRow: number) {
    this.#hasAdvanced = false;
    this.#isTableEnd = isTableEnd;
    this.#currentRow = currentRow;
    this.#state = {
      isTableEnd: this.#isTableEnd,
      currentRow: this.#currentRow,
    };
  }

  get isTableEnd(): boolean {
    return this.#isTableEnd;
  }

  set isTableEnd(value: boolean) {
    this.#isTableEnd = value;
    if (!this.#hasAdvanced) this.#state.isTableEnd = value;
  }

  get currentRow(): number {
    return this.#currentRow;
  }

  set currentRow(value: number) {
    this.#currentRow = value;
    if (!this.#hasAdvanced) this.#state.currentRow = value;
  }

  /**
   * Calculates page number and row offset of current location
   * @param rowLimit maximum number of rows page can hold
   * @returns [page number, row offset on page]
   */
  async getPosition(rowLimit: number): Promise<[number, number]> {
    const pageNum = ~~(this.#currentRow / rowLimit);
    const byteOffset = (this.#currentRow % rowLimit) * Database.MAX_ROW_SIZE;
    return [pageNum, byteOffset];
  }

  /**
   * Moves cursor forward to the next row
   * @param limit maximum number of rows table can hold
   */
  advance(limit: number) {
    if (!this.#hasAdvanced) this.#hasAdvanced = true;
    this.currentRow = this.#currentRow + 1;
    if (this.#currentRow >= limit) this.isTableEnd = true;
  }

  /** Restores and unlocks for state updates */
  reset() {
    this.isTableEnd = this.#state.isTableEnd;
    this.currentRow = this.#state.currentRow;
    this.#hasAdvanced = false;
  }
}
