import {
  ReadStream,
  WriteStream,
  createReadStream,
  createWriteStream,
  read,
  stat,
  write,
} from "fs";
import { open } from "fs/promises";
import { exit } from "process";
import Cyberlite from "./cyberlite";
import logger from "./logger";
import { FixedArray } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

/** Caches pages and writes to db file  */
export default class Pager {
  readonly filename: string;
  fileDescriptor: number;
  fileLength: number;
  rs: ReadStream;
  ws: WriteStream;
  pages: FixedArray<Buffer | null, 100>;

  /**
   * @param filename location of the db file
   */
  constructor(filename: string) {
    this.filename = filename;
    this.getFile(filename)
      .then(({ fd, size }) => {
        this.fileDescriptor = fd;
        this.fileLength = size;
        this.rs = createReadStream("", { fd });
        this.ws = createWriteStream("", { fd });
        this.pages = Array.apply(null, {
          length: Cyberlite.TABLE_MAX_PAGES,
        });
      })
      .catch(() => {
        logger.error(
          propertyOf(CB.CyberliteError, (x) => x.CYBERLITE_INTERNAL),
        );
        exit(1);
      });
  }

  /**
   * Opens the db file for writing
   * @param filename location of the db file
   * @returns file descriptor and file length
   */
  getFile = async (filename: string) => {
    try {
      const { fd } = await open(filename, "w");

      let size: number;
      stat(filename, (err, stats) => {
        if (err) throw err;
        size = stats.size;
      });

      return { fd, size };
    } catch {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.IOERR_OPEN));
      exit(1);
    }
  };

  /**
   * Checks for page in cache or reads from db file
   * @param pageNum page to retrieve
   * @returns requested buffer
   */
  getPage = (pageNum: number) => {
    if (pageNum > Cyberlite.TABLE_MAX_PAGES) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      process.exit(1);
    }

    // page not cached. create and load from db file
    if (!this.pages[pageNum]) {
      const page = Buffer.alloc(Cyberlite.PAGE_SIZE);
      let numPages = ~~(this.fileLength / Cyberlite.PAGE_SIZE);

      if (this.fileLength % Cyberlite.PAGE_SIZE) numPages += 1;

      if (pageNum <= numPages) {
        read(
          this.fileDescriptor,
          page,
          0,
          Cyberlite.PAGE_SIZE,
          pageNum * Cyberlite.PAGE_SIZE,
          (err) => {
            if (err) {
              logger.error(propertyOf(CB.Error.System, (x) => x.IOERR_READ));
              exit(1);
            }
          },
        );
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

    write(
      this.fileDescriptor,
      this.pages[pageNum],
      0,
      Cyberlite.PAGE_SIZE,
      pageNum * Cyberlite.PAGE_SIZE,
      (err) => {
        if (err) {
          logger.error(propertyOf(CB.CyberliteError, (x) => x.IOERR_WRITE));
          exit(1);
        }
      },
    );
  };
}
