import Database from "../src/database";
import CyberliteRepl from "../src/repl";
import { TEST_DB } from "./_utils";

jest.mock("../src/database")

describe("CyberliteRepl", () => {
    let repl: CyberliteRepl;
    let mockDB = jest.mocked(Database, { shallow: true });

    beforeEach(() => {
        repl = new CyberliteRepl(TEST_DB);
        mockDB.mockClear();
    })

    afterAll(() => {
        repl.rl.close();
    })

    it("instantiates a new REPL", () => {
      new CyberliteRepl(TEST_DB);
      expect(true).toBeTruthy()
      expect(mockDB.mock.calls).toHaveLength(1)
    })

    describe(".start", () => {
        it("defines a function", () => {
            expect(typeof repl.start).toBe("function")
        })
    })

    describe(".run", () => {
        it("defines a function", () => {
            expect(typeof repl.run).toBe("function")
        })
    })

    describe(".stop", () => {
        it("defines a function", () => {
            expect(typeof repl.stop).toBe("function")
        })
    })
})
