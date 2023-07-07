import env from "./env";
import Table from "./table";
import VM from "./vm";

/** Handles the database file */
export default class Database {
  vm: VM;
  tables: Record<string, Table> = {};
  #activeTable: Table;

  // default: NTFS block size
  static readonly PAGE_SIZE: number = env.PAGE_SIZE;
  static readonly TABLE_MAX_PAGES: number = env.MAX_TABLE_ROWS;
  // TODO: hardcoded until dynamic tables implemented
  static readonly MAX_ROW_SIZE: number = 1165;

  constructor(path: string) {
    this.vm = new VM();
    const table = new Table("users", path);
    this.tables["users"] = table;
    this.activeTable = table;
  }

  /**
   * Opens db file and loads tables
   * @param path location of the db file
   */
  async open() {
    await this.activeTable.pager.loadData();
    this.activeTable.numRows = this.activeTable.endCursor.currentRow = ~~(
      this.activeTable.pager.fileLength / Database.MAX_ROW_SIZE
    );
  }

  /** Flushes data and resets page cache */
  async close() {
    Object.values(this.tables).forEach(async (table) => {
      const numFullPages = Math.ceil(table.numRows / table.pager.maxRows);

      for (let i = 0; i < numFullPages; i++) {
        if (table.pager.pages[i]) {
          await table.pager.flush(i);
          table.pager.pages[i] = null;
        }
      }

      table.pager.pages.forEach((p, i) => {
        if (p) table.pager.pages[i] = null;
      });
    });
  }

  get activeTable(): Table {
    return this.#activeTable;
  }

  set activeTable(value: Table) {
    this.#activeTable = value;
    this.tables[this.activeTable.name] = this.activeTable;
  }
}
