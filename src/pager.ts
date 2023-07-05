import fs from "fs";
import { exit } from "process";
import Database from "./database";
import logger from "./logger";
import { FixedArray } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";
import { FileHandle } from "fs/promises";

/** Caches pages and writes to db file  */
export default class Pager {
  readonly filename: string;
  #fileHandle: FileHandle;
  fileLength: number;
  pages: FixedArray<Buffer | null, 100>;

  /**
   * @param filename location of the db file
   */
  constructor(filename: string) {
    this.filename = filename;
    this.getFile(filename).then((size) => {
      this.fileLength = size;
      this.pages = Array.apply(null, {
        length: Database.TABLE_MAX_PAGES,
      });
    });
  }

  /**
   * Opens the db file for writing
   * @param filename location of the db file
   * @returns file descriptor and file length
   */
  getFile = async (filename: string) => {
    let size: number;

    try {
      // open with 'w' flag creates file or truncates existing
      this.#fileHandle = await fs.promises.open(filename, "w");
    } catch (err) {
      console.error(err);
      logger.error(propertyOf(CB.CyberliteError, (x) => x.IOERR_READ));
      exit(1);
    } finally {
      this.#fileHandle?.close();
      this.#fileHandle = null;
    }

    return size;
  };

  /**
   * Checks for page in cache or reads from db file
   * @param pageNum page to retrieve
   * @returns requested buffer
   */
  getPage = async (pageNum: number) => {
    if (pageNum > Database.TABLE_MAX_PAGES) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      process.exit(1);
    }

    // page not cached. create and load from db file
    if (!this.pages[pageNum]) {
      const page = Buffer.alloc(Database.PAGE_SIZE);
      let numPages = ~~(this.fileLength / Database.PAGE_SIZE);

      if (this.fileLength % Database.PAGE_SIZE) numPages++;

      if (pageNum <= numPages) {
        try {
          this.#fileHandle = await fs.promises.open(this.filename, "w");
          await this.#fileHandle.read(
            page,
            0,
            Database.PAGE_SIZE,
            pageNum * Database.PAGE_SIZE,
          );
        } catch (err) {
          console.error(err);
          logger.error(propertyOf(CB.Error.System, (x) => x.IOERR_READ));
          exit(1);
        } finally {
          this.#fileHandle?.close();
          this.#fileHandle = null;
        }
      }

      this.pages[pageNum] = page;
    }

    return this.pages[pageNum];
  };

  /**
   * Commits changes in page cache
   * @param pageNum
   */
  flush = async (pageNum: number) => {
    if (!this.pages[pageNum]) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.CYBERLITE_INTERNAL));
      exit(1);
    }

    try {
      this.#fileHandle = await fs.promises.open(this.filename, "w");
      this.#fileHandle.write(
        this.pages[pageNum],
        0,
        Database.PAGE_SIZE,
        pageNum * Database.PAGE_SIZE,
      );
    } catch (err) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.IOERR_WRITE));
      exit(1);
    } finally {
      this.#fileHandle?.close();
      this.#fileHandle = null;
    }
  };
}
