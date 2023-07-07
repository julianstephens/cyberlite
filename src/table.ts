import Cursor from "./cursor";
import Database from "./database";
import Pager from "./pager";

/** Represents a single db table */
export default class Table {
  readonly name: string;
  readonly maxRows: number;

  #numRows: number;

  startCursor: Cursor;
  endCursor: Cursor;
  pager: Pager;

  constructor(name: string, path: string) {
    this.name = name;
    this.startCursor = new Cursor(false, 0);
    this.endCursor = new Cursor(true, this.#numRows);
    this.maxRows = ~~(Database.PAGE_SIZE / Database.MAX_ROW_SIZE);
    this.pager = new Pager(path, this.maxRows);
  }

  get numRows(): number {
    return this.#numRows;
  }

  set numRows(value: number) {
    this.#numRows = value;
  }

  /**
   * Retrieves the page and location for a row
   * @param cursorType
   * @returns [page number, page, row offset on page]
   */
  async getRowOffset(
    cursorType: "start" | "end",
  ): Promise<[number, Buffer, number]> {
    const [pageNum, byteOffset] =
      cursorType === "start"
        ? await this.startCursor.getPosition(this.pager.maxRows)
        : await this.endCursor.getPosition(this.pager.maxRows);

    const page =
      // check page cache
      this.pager.pages[pageNum] ??
      // check db file
      (await this.pager.getPage(pageNum)) ??
      // create new page
      Buffer.alloc(Database.PAGE_SIZE);

    return [pageNum, page, byteOffset];
  }
}
