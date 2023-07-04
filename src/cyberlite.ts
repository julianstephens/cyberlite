import { close } from "fs";
import { exit } from "process";
import logger from "./logger";
import Table from "./table";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

/**
 * Cyberlite database
 */
export default class Cyberlite {
  tables: Table[] = [];

  // default: NTFS block size
  static readonly PAGE_SIZE: number = 4096;
  static readonly TABLE_MAX_PAGES: number = 100;
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
