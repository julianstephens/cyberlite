import fs from "fs";
import { FileHandle } from "fs/promises";
import Database from "../src/database";
import Table from "../src/table";
import VM from "../src/vm";
import { TEST_DB } from "./_utils";

jest.mock("../src/vm")

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(TEST_DB);
  })

  it("instantiates a new database", () => {
    let mockVM = jest.mocked(VM, { shallow: false })
    new Database(TEST_DB);
    expect(mockVM).toHaveBeenCalled();
  })

  describe(".open", () => {
    it("defines a function", () => {
      expect(typeof db.open).toBe("function")
    })

    it("creates a new empty db", async () => {
      await db.open();
      let fileExists = false;
      let size = +Infinity;
      let fh: FileHandle | null = null;

      try {
        fh = await fs.promises.open(TEST_DB)
        const stats = await fh.stat();
        if (fh) fileExists = true
        size = stats.size;
      } catch {
        fileExists = false
      } finally {
        await fh?.close()
      }

      expect(fileExists).toBe(true);
      expect(size).toBe(0);
      expect(db.activeTable).toBeInstanceOf(Table);
      expect(db.tables).toBeDefined()
      expect(Object.keys(db.tables)).toHaveLength(1);
      expect(Object.keys(db.tables)[0]).toBe("users");
      expect(Object.values(db.tables)[0]).toBeInstanceOf(Table);
    })
  })

  describe(".close", () => {
    it("defines a function", () => {
      expect(typeof db.close).toBe("function")
    })

    // TODO: write test to check flush happens successfully
  })
})
