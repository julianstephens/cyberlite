import Database from "./database";
import Pager from "./pager";

/** Represents a single db table */
export default class Table {
  readonly name: string;
  readonly rowsPerPage: number;
  readonly maxRows: number;

  #numRows: number;
  pager: Pager;

  constructor(name: string, path: string) {
    this.name = name;
    this.rowsPerPage = ~~(Database.PAGE_SIZE / Database.MAX_ROW_SIZE);
    this.maxRows = this.rowsPerPage * Database.TABLE_MAX_PAGES;
    this.pager = new Pager(path);
  }

  get numRows(): number {
    return this.#numRows;
  }

  set numRows(value: number) {
    this.#numRows = value;
  }

  /**
   * Retrieves the page and location for a row
   * @param rowNum row to get location of
   * @returns [page number, page, row start position on page]
   */
  async getRowSlot(rowNum: number): Promise<[number, Buffer, number]> {
    const pageNum = ~~(rowNum / this.rowsPerPage);
    const byteOffset = (rowNum % this.rowsPerPage) * Database.MAX_ROW_SIZE;

    const page =
      this.pager.pages[pageNum] ?? // check page cache
      (await this.pager.getPage(pageNum)) ?? // check db file
      Buffer.alloc(Database.PAGE_SIZE); // create new page

    return [pageNum, page, byteOffset];
  }
}
