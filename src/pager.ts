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
  #fileHandle: FileHandle | null = null;
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

  #handleError = (err: unknown, status: CB.CyberliteErrorStatus) => {
    if (err) {
      console.error(err);
      logger.error(propertyOf(CB.CyberliteError, (x) => x[status]));
      exit(1);
    }
  };

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
      this.#handleError(err, "IOERR_READ");
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
  getPage = (pageNum: number) => {
    if (pageNum > Database.TABLE_MAX_PAGES) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      process.exit(1);
    }

    // page not cached. create and load from db file
    const page = Buffer.alloc(Database.PAGE_SIZE);
    let numPages = ~~(this.fileLength / Database.PAGE_SIZE);
    let parsedPage;

    if (this.fileLength % Database.PAGE_SIZE) numPages++;

    if (pageNum <= numPages) {
      fs.promises.open(this.filename, "w").then(
        async (fh) => {
          const size = fs.statSync(this.filename).size;
          if (size && size !== 0) {
            fh.read(
              page,
              0,
              Database.PAGE_SIZE,
              pageNum * Database.PAGE_SIZE,
            ).then(
              async () => {
                parsedPage = page;
                await fh.close();
              },
              (err) => {
                this.#handleError(err, "IOERR_READ");
              },
            );
          } else {
            parsedPage = page;
            await fh.close();
          }
        },
        (err) => {
          this.#handleError(err, "IOERR_OPEN");
        },
      );
    }
    return parsedPage;
  };

  /**
   * Commits changes in page cache
   * @param pageNum
   */
  flush = (pageNum: number) => {
    if (!this.pages[pageNum]) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.CYBERLITE_INTERNAL));
      exit(1);
    }

    fs.promises.open(this.filename, "w").then(
      async (fh) => {
        fh.write(
          this.pages[pageNum],
          0,
          Database.PAGE_SIZE,
          pageNum * Database.PAGE_SIZE,
        ).then(
          () => {
            fh.close().then(
              () => {},
              (err) => {
                this.#handleError(err, "IOERR_CLOSE");
              },
            );
          },
          (err) => {
            this.#handleError(err, "IOERR_WRITE");
          },
        );
      },
      (err) => {
        this.#handleError(err, "IOERR_OPEN");
      },
    );
  };
}
