import { close } from "fs";
import { exit } from "process";
import logger from "./logger";
import Table from "./table";
import { Cyberlite as CB } from "./types/cyberlite";

export default class Cyberlite {
  tables: Table[] = [];

  static PAGE_SIZE = 4096;
  static TABLE_MAX_PAGES = 100;
  static MAX_ROW_SIZE = 1165;

  open = async (filename: string) => {
    const table = new Table(filename);
    this.tables.push(table);
  };

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
        logger.error(CB.Error.System.IOERR_CLOSE);
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
