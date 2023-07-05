import env from "./env";
import Table from "./table";

/**
 * Handles the database file
 */
export default class Database {
  tables: Table[] = [];

  // default: NTFS block size
  static readonly PAGE_SIZE: number = env.PAGE_SIZE;
  static readonly TABLE_MAX_PAGES: number = env.MAX_TABLE_ROWS;
  // TODO: hardcoded until dynamic tables implemented
  static readonly MAX_ROW_SIZE: number = 1165;

  /**
   * Opens db file and loads tables
   * @param filename location of the db file
   */
  open = async (filename: string) => {
    const table = new Table(filename);
    this.tables.push(table);
  };

  /**
   * Flushes data and resets page cache
   * @param table table to close
   */
  static close = async (table: Table) => {
    const numFullPages = ~~(table.numRows / table.rowsPerPage);

    for (let i = 0; i < numFullPages; i++) {
      if (!table.pager.pages[i]) {
        continue;
      }

      table.pager.flush(i);
      table.pager.pages[i] = null;
    }

    table.pager.pages.forEach((p, i) => {
      if (p) {
        table.pager.pages[i] = null;
      }
    });
  };
}
