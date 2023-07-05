import Database from "./database";
import Pager from "./pager";

/** Represents a single db table */
export default class Table {
  readonly rowsPerPage: number;
  readonly maxRows: number;
  numRows: number = 0;
  pager: Pager;

  constructor(filename: string) {
    this.rowsPerPage = ~~(Database.PAGE_SIZE / Database.MAX_ROW_SIZE);
    this.maxRows = this.rowsPerPage * Database.TABLE_MAX_PAGES;
    // this.numRows = ~~(this.pager.fileLength / Database.MAX_ROW_SIZE);
    this.pager = new Pager(filename);
  }

  /**
   * Retrieves the page and location for a row
   * @param rowNum row to get location of
   * @returns [page number, page, row start position on page]
   */
  getRowSlot = async (rowNum: number): Promise<[number, Buffer, number]> => {
    const pageNum = ~~(rowNum / this.rowsPerPage);
    const rowOffset = rowNum % this.rowsPerPage;
    const byteOffset = rowOffset * Database.MAX_ROW_SIZE;

    let page = await this.pager.getPage(pageNum);
    if (!page) page = this.pager[pageNum] = Buffer.alloc(Database.PAGE_SIZE);

    return [pageNum, page, byteOffset];
  };
}
