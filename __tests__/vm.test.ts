import Database from "../src/database";
import Parser from "../src/parser";
import { SqlStatement } from "../src/types";
import { Cyberlite } from "../src/types/cyberlite";
import { HELP_MSG, propertyOf } from "../src/utils";
import { INSERT_STATEMENT, SELECT_STATEMENT, TEST_DB, cleanText, clearDb } from "./_utils";

jest.mock("../src/parser")

describe("VM", () => {
  let db: Database;
  let mockConsole: jest.SpyInstance;
  let mockClear: jest.SpyInstance;

  beforeEach(() => {
    clearDb();
    db = new Database(TEST_DB);
    mockConsole = jest.spyOn(console, "log");
    mockClear = jest.spyOn(console, "clear");
  })

  describe(".executeMetaCommand", () => {
    it("defines a function", () => {
      expect(typeof db.vm.executeMetaCommand).toBe("function")
    })

    it("prints the help command", () => {
      db.vm.executeMetaCommand(".help");
      expect(mockConsole.mock.calls[0][0]).toBe(HELP_MSG)
    })

    it("clears the console", () => {
      db.vm.executeMetaCommand(".clear")
      expect(mockClear).toHaveBeenCalled()
    })

    it("throws UNKNOWN_COMMAND", () => {
      const res = db.vm.executeMetaCommand("unrecognized")
      expect(res).toBe(propertyOf(Cyberlite.CyberliteError, x => x.UNKNOWN_COMMAND))
    })
  })

  describe(".execute", () => {
    it("defines a function", () => {
      expect(typeof db.vm.execute).toBe("function")
    })

    it("throws UNKNOWN_COMMAND", async () => {
      const kw = "unknown"
      await db.vm.execute({ ...INSERT_STATEMENT, method: kw } as unknown as SqlStatement, db.activeTable)
      expect(cleanText(mockConsole.mock.calls[0][0])).toBe(`Unrecognized keyword '${kw}'`)
    })

    it("throws TABLE_FULL", async () => {
      await db.open()
      for (let i = 0; i < db.activeTable.maxRows + 1; i++) {
        let table = await db.vm.execute(INSERT_STATEMENT, db.activeTable)
        if (table) db.activeTable = table;
        table = undefined;
      }
      expect(cleanText(mockConsole.mock.calls[4][0])).toBe(Cyberlite.CyberliteError.TABLE_FULL)
    })

    it("throws TABLE_EMPTY", async () => {
      await db.vm.execute(SELECT_STATEMENT, db.activeTable)
      expect(cleanText(mockConsole.mock.calls[0][0])).toBe(Cyberlite.CyberliteError.TABLE_EMPTY);
    })

    it("throws MISSING_PROP", async () => {
      let mockParser = jest.mocked(Parser, { shallow: false })
      mockParser.prototype.parseCommand.mockImplementation(() => {
        throw { name: propertyOf(Cyberlite.CyberliteError, x => x.MISSING_PROP), message: "username" }
      })

      const data = { ...INSERT_STATEMENT, data: { ...INSERT_STATEMENT.data, username: "" }} as SqlStatement;
      await db.vm.execute(data, db.activeTable)

      expect(cleanText(mockConsole.mock.calls[0][0])).toBe("Missing param 'username'")
    })
  })
})
