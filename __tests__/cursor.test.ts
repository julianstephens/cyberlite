import Database from "../src/database";
import { INSERT_STATEMENT, TEST_DB, clearDb } from "./_utils";


describe("Cursor", () => {
  let db: Database;

  beforeEach(() => {
    clearDb();
    db = new Database(TEST_DB);
  })

  describe(".getPosition & .advance", () => {
    it("defines a function", () => {
      expect(typeof db.activeTable.startCursor.getPosition).toBe("function")
    })

    it("modifies and returns the cursor position", async () => {
      await db.open()
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, 0])
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, Database.MAX_ROW_SIZE * 2])
    })

    it("advances the end cursor to the table end", async () => {
      await db.open()
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, 0])
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      expect(db.activeTable.endCursor.isTableEnd).toBeTruthy()
    })
  })

  describe(".reset", () => {
    it("defines a function", () => {
      expect(typeof db.activeTable.startCursor.reset).toBe("function")
    })

    it("reverts the cursor to a previous position", async () => {
      await db.open()
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, 0])
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await db.vm.execute(INSERT_STATEMENT, db.activeTable)
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, Database.MAX_ROW_SIZE * 2])
      db.activeTable.endCursor.reset()
      await expect(db.activeTable.endCursor.getPosition(db.activeTable.pager.maxRows)).resolves.toEqual([0, 0])
    })
  })
})
