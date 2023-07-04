import Cyberlite from "./cyberlite";
import Pager from "./pager";

/** Represents a single db table */
export default class Table {
  readonly rowsPerPage: number;
  readonly maxRows: number;
  numRows: number;
  pager: Pager;

  constructor(filename: string) {
    this.rowsPerPage = ~~(Cyberlite.PAGE_SIZE / Cyberlite.MAX_ROW_SIZE);
    this.maxRows = this.rowsPerPage * Cyberlite.TABLE_MAX_PAGES;
    this.numRows = ~~(this.pager.fileLength / Cyberlite.MAX_ROW_SIZE);
    this.pager = new Pager(filename);
  }

  /**
   * Retrieves the page and location for a row
   * @param rowNum row to get location of
   * @returns [page number, page, row start position on page]
   */
  getRowSlot = (rowNum: number): [number, Buffer, number] => {
    const pageNum = ~~(rowNum / this.rowsPerPage);
    const rowOffset = rowNum % this.rowsPerPage;
    const byteOffset = rowOffset * Cyberlite.MAX_ROW_SIZE;

    let page = this.pager.getPage(pageNum);
    if (!page) page = this.pager[pageNum] = Buffer.alloc(Cyberlite.PAGE_SIZE);

    return [pageNum, page, byteOffset];
  };
}
