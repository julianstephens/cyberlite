import env from "./env";
import Table from "./table";
import VM from "./vm";

/**
 * Handles the database file
 */
export default class Database {
  vm: VM;
  tables: Record<string, Table> = {};
  #activeTable: Table;

  // default: NTFS block size
  static readonly PAGE_SIZE: number = env.PAGE_SIZE;
  static readonly TABLE_MAX_PAGES: number = env.MAX_TABLE_ROWS;
  // TODO: hardcoded until dynamic tables implemented
  static readonly MAX_ROW_SIZE: number = 1165;

  /**
   * Opens db file and loads tables
   * @param filename location of the db file
   */
  open = (filename: string) => {
    this.vm = new VM();
    const table = new Table(filename, "users");
    this.tables["users"] = table;
    this.activeTable = table;
  };

  /** Flushes data and resets page cache */
  close = () => {
    Object.values(this.tables).forEach((table) => {
      const numFullPages = ~~(table.numRows / table.rowsPerPage);

      for (let i = 0; i < numFullPages; i++) {
        if (table.pager.pages[i]) {
          table.pager.flush(i);
          table.pager.pages[i] = null;
        }
      }

      table.pager.pages.forEach((p, i) => {
        if (p) table.pager.pages[i] = null;
      });
    });
  };

  get activeTable(): Table {
    return this.#activeTable;
  }

  set activeTable(value: Table) {
    this.#activeTable = value;
    this.tables[this.activeTable.name] = this.activeTable;
  }
}
