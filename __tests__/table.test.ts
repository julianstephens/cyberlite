import Cursor from "../src/cursor";
import Database from "../src/database";
import Pager from "../src/pager";
import Table from "../src/table";
import { TEST_DB } from "./_utils";

jest.mock("../src/pager")
jest.mock("../src/cursor")

describe("Table", () => {
  let table: Table;
  let mockPager = jest.mocked(Pager, { shallow: false })
  let mockCursor = jest.mocked(Cursor, { shallow: false })

  beforeEach(() => {
    table = new Table("users", TEST_DB)
    mockPager.mockClear()
    mockCursor.mockClear()
  })

  it("instantiates a new table", () => {
    const t = new Table("users", TEST_DB)
    expect(t.name).toBe("users");
    expect(mockPager.mock.calls).toHaveLength(1)
    expect(mockCursor.mock.calls).toHaveLength(2)
  })

  describe(".getRowOffset", () => {
    it("defines a function", () => {
      expect(typeof table.getRowOffset).toBe("function")
    })

    it("initializes start cursor at beginning db", async () => {
      mockPager.prototype.pages = [] as any
      mockPager.prototype.getPage.mockReturnValue(new Promise(resolve => resolve(undefined as unknown as Buffer)))
      mockCursor.prototype.getPosition.mockReturnValue(new Promise(resolve => resolve([0, 0])))

      const [pageNum, page, offset ] = await table.getRowOffset("start")
      console.log(page.length)

      expect(pageNum).toBe(0)
      expect(page.length).toBe(Database.PAGE_SIZE)
      expect(page.every((el) => el === 0)).toBe(true)
      expect(offset).toBe(0)
    })

    it("initializes end cursor at beginning db", async () => {
      mockPager.prototype.pages = [] as any
      mockPager.prototype.getPage.mockReturnValue(new Promise(resolve => resolve(undefined as unknown as Buffer)))
      mockCursor.prototype.getPosition.mockReturnValue(new Promise(resolve => resolve([0, 0])))

      const [pageNum, page, offset ] = await table.getRowOffset("end")
      console.log(page.length)

      expect(pageNum).toBe(0)
      expect(page.length).toBe(Database.PAGE_SIZE)
      expect(page.every((el) => el === 0)).toBe(true)
      expect(offset).toBe(0)
    })
  })
})
