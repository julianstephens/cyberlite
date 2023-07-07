import fs from "fs";
import { FileHandle } from "fs/promises";
import Database from "../src/database";
import Pager from "../src/pager";
import { Cyberlite } from "../src/types/cyberlite";
import { propertyOf } from "../src/utils";
import { PAGE_TEXT, TEST_DB, cleanText, clearDb, seed } from "./_utils";


describe("Pager", () => {
  let pager: Pager;
  let mockConsole: jest.SpyInstance;

  beforeEach(() => {
    clearDb();
    pager = new Pager(TEST_DB, 3);
    mockConsole = jest.spyOn(console, "log");
  })

  afterEach(() => {
    jest.clearAllMocks();
  })

  it("instantiates a new pager", () => {
    const p = new Pager(TEST_DB, 3)

    expect(p.path).toBe(TEST_DB);
    expect(p.fileLength).toBe(0);
    expect(p.maxRows).toBe(3);
    expect(p.pages).toHaveLength(Database.TABLE_MAX_PAGES);
  })

  describe(".loadData", () => {
    it("defines a function", () => {
      expect(typeof pager.loadData).toBe("function")
    })

    it("creates an empty page cache for a new db", async () => {
      await pager.loadData()

      let fileExists = true;
      let size = +Infinity;

      let fh: FileHandle | null = null;
      try {
         fh = await fs.promises.open(TEST_DB, "r");
         const stats = await fh.stat();
         size = stats.size;
      } catch {
        fileExists = false;
      } finally {
        await fh?.close();
      }

      expect(fileExists).toBeTruthy();
      expect(size).toBe(0);
      expect(pager.pages.every((el) => !el)).toBeTruthy()
    })

    it("initializes a page cache with existing data", async () => {
      await seed();
      await pager.loadData();

      expect(pager.pages[0]).toBeDefined();
      expect(cleanText(pager.pages[0]?.toString()!)).toBe(PAGE_TEXT);
    })

    it("throws IOERR_OPEN", async () => {
      let mockOpen = jest.spyOn(fs.promises, "open")
      mockOpen.mockRejectedValue(new Error(Cyberlite.CyberliteError.IOERR_OPEN))

      await expect(pager.loadData()).rejects.toThrow(Error(propertyOf(Cyberlite.CyberliteError, x => x.IOERR_OPEN)))
      expect(cleanText(mockConsole.mock.calls[0][0])).toEqual(Cyberlite.CyberliteError.IOERR_OPEN)
    })
  })

  describe(".getPage", () => {
    it("defines a function", () => {
      expect(typeof pager.getPage).toBe("function")
    })

    it("reads an existing page from the db file", async () => {
      await seed();
      await pager.loadData();
      const page = await pager.getPage(0)
      const text = page.toString()

      expect(cleanText(text)).toBe(PAGE_TEXT)
    })

    it("throws TABLE_FULL", async () => {
      await expect(pager.getPage(10_000)).rejects.toThrow(Error(propertyOf(Cyberlite.CyberliteError, x => x.TABLE_FULL)))
      expect(cleanText(mockConsole.mock.calls[0][0])).toEqual(Cyberlite.CyberliteError.TABLE_FULL)
    })

    it("throws IOERR_READ", async () => {
      let mockOpen = jest.spyOn(fs.promises, "open")
      mockOpen.mockRejectedValue(new Error(Cyberlite.CyberliteError.IOERR_READ))

      await expect(pager.getPage(0)).rejects.toThrow(Error(propertyOf(Cyberlite.CyberliteError, x => x.IOERR_READ)))
      expect(cleanText(mockConsole.mock.calls[0][0])).toEqual(Cyberlite.CyberliteError.IOERR_READ)
    })
  })

  describe(".flush", () => {
    it("defines a function", () => {
      expect(typeof pager.flush).toBe("function")
    })

    it("writes data from the page cache to the db file", async () => {
      pager.pages = await seed(1, false);
      await pager.flush(0);

      let size = +Infinity;
      let fh: FileHandle | null = null;
      const content = Buffer.alloc(Database.PAGE_SIZE)

      try {
         fh = await fs.promises.open(TEST_DB, "r");
         await fh.read(content, 0, Database.PAGE_SIZE, 0)
         const stats = await fh.stat();
         size = stats.size;
      } finally {
        await fh?.close();
      }

      expect(size).toBe(Database.PAGE_SIZE)
      expect(cleanText(content.toString())).toBe(PAGE_TEXT)
    })

    it("throws CYBERLITE_INTERNAL", async () => {
      await expect(pager.flush(-1)).rejects.toThrow(Error(propertyOf(Cyberlite.CyberliteError, x => x.CYBERLITE_INTERNAL)))
      expect(cleanText(mockConsole.mock.calls[0][0])).toEqual(Cyberlite.CyberliteError.CYBERLITE_INTERNAL)
    })
  })
})
