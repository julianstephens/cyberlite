import { promises as fsPromises } from "fs";
import { FileHandle } from "fs/promises";
import Database from "./database";
import logger from "./logger";
import { FixedArray } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

/** Caches pages and writes to db file  */
export default class Pager {
  readonly path: string;
  readonly maxRows: number;

  #fileHandle: FileHandle | null = null;

  fileLength: number;
  pages: FixedArray<Buffer | null, 100>;

  constructor(path: string, maxRows: number) {
    this.path = path;
    this.fileLength = 0;
    this.maxRows = maxRows;
    this.pages = Array.apply(null, {
      length: Database.TABLE_MAX_PAGES,
    });
  }

  #handleError(status: CB.CyberliteErrorStatus, err?: unknown) {
    if (err) {
      const cbErr = propertyOf(CB.CyberliteError, (x) => x[status]);
      logger.error(cbErr, { useDefault: true });
      process.exitCode = 1;
      throw new Error(cbErr);
    }
  }

  /** Loads pages from existing db file or creates a new one */
  async loadData() {
    try {
      this.#fileHandle = await fsPromises.open(this.path, "a+");
      const { size } = await this.#fileHandle.stat();
      this.fileLength = size;
      const rs = this.#fileHandle.createReadStream({
        highWaterMark: Database.PAGE_SIZE,
      });

      for await (const chunk of rs) {
        const openPage = this.pages.findIndex((p) => !p);
        if (openPage >= 0) this.pages[openPage] = chunk;
      }
    } catch (err) {
      this.#handleError("IOERR_OPEN", err);
    } finally {
      await this.#fileHandle?.close();
      this.#fileHandle = null;
    }
  }

  /**
   * Checks for page in cache or reads from db file
   * @param pageNum page to retrieve
   * @returns requested buffer
   */
  async getPage(pageNum: number) {
    if (pageNum > Database.TABLE_MAX_PAGES) {
      this.#handleError("TABLE_FULL", true);
    }

    // page not cached. create and load from db file
    const page = Buffer.alloc(Database.PAGE_SIZE);
    let numPages = ~~(this.fileLength / Database.PAGE_SIZE);
    let parsedPage: Buffer;

    // check for partial page
    if (this.fileLength % Database.PAGE_SIZE) numPages++;

    if (pageNum <= numPages) {
      try {
        this.#fileHandle = await fsPromises.open(this.path, "r");
        const { size } = await this.#fileHandle.stat();
        if (size && size > 0) {
          const res = await this.#fileHandle.read(
            page,
            0,
            Database.PAGE_SIZE,
            pageNum * Database.PAGE_SIZE,
          );
          parsedPage = res.buffer;
        }
      } catch (err) {
        this.#handleError("IOERR_READ", err);
      } finally {
        await this.#fileHandle?.close();
        this.#fileHandle = null;
      }
    }
    return parsedPage;
  }

  /**
   * Commits changes in page cache
   * @param pageNum
   */
  async flush(pageNum: number) {
    if (!this.pages[pageNum]) {
      this.#handleError("CYBERLITE_INTERNAL", true);
    }

    try {
      this.#fileHandle = await fsPromises.open(this.path, "a+");
      await this.#fileHandle.write(
        this.pages[pageNum],
        0,
        Database.PAGE_SIZE,
        pageNum * Database.PAGE_SIZE,
      );
      const { size } = await this.#fileHandle.stat();
      this.fileLength = size;
    } catch (err) {
      this.#handleError("IOERR_OPEN", err);
    } finally {
      await this.#fileHandle?.close();
      this.#fileHandle = null;
    }
  }
}
