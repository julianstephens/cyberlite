import { close } from "fs";
import { exit } from "process";
import env from "./env";
import logger from "./logger";
import Table from "./table";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

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
   * Flushes cached data and closes db file
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

    close(table.pager.fileDescriptor, (err) => {
      if (err) {
        logger.error(propertyOf(CB.CyberliteError, (x) => x.IOERR_CLOSE));
        exit(1);
      }
    });

    table.pager.pages.forEach((p, i) => {
      if (p) {
        table.pager.pages[i] = null;
      }
    });
  };
}
