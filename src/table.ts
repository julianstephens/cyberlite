import Cyberlite from "./cyberlite";
import Pager from "./pager";

export default class Table {
  rowsPerPage: number;
  maxRows: number;
  numRows: number;
  pager: Pager;

  constructor(filename: string) {
    this.rowsPerPage = ~~(Cyberlite.PAGE_SIZE / Cyberlite.MAX_ROW_SIZE);
    this.maxRows = this.rowsPerPage * Cyberlite.TABLE_MAX_PAGES;
    this.numRows = ~~(this.pager.fileLength / Cyberlite.MAX_ROW_SIZE);
    this.pager = new Pager(filename);
  }

  getRowSlot = (rowNum: number): [number, Buffer, number] => {
    const pageNum = ~~(rowNum / this.rowsPerPage);
    const rowOffset = rowNum % this.rowsPerPage;
    const byteOffset = rowOffset * Cyberlite.MAX_ROW_SIZE;

    let page = this.pager.getPage(pageNum);
    if (!page) page = this.pager[pageNum] = Buffer.alloc(Cyberlite.PAGE_SIZE);

    return [pageNum, page, byteOffset];
  };
}
