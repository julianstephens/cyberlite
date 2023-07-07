import Database from "../src/database";
import Parser from "../src/parser";
import { Cyberlite } from "../src/types/cyberlite";
import { propertyOf } from "../src/utils";
import { INSERT_STATEMENT, SELECT_STATEMENT, cleanText } from "./_utils";


describe("Parser", () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  })

  afterEach(() => {
    jest.clearAllMocks();
  })

  describe(".parseSqlStatement", () => {
    it("defines a function", () => {
      expect(typeof Parser.parseSqlStatement).toBe("function")
    })

    it("returns valid insert statement", () => {
      const statement = "insert 1 user1 email1";
      const parsed = Parser.parseSqlStatement(statement)
      const { data, ...res } = INSERT_STATEMENT;

      expect(parsed).toEqual(res)
    })

    it("returns valid select statement", () => {
      const statement = `${SELECT_STATEMENT.method}${SELECT_STATEMENT.command}`;
      const parsed = Parser.parseSqlStatement(statement)
      expect(parsed).toEqual(SELECT_STATEMENT)
    })

    it("throws UNKNOWN_COMMAND", () => {
      const statement = "cannot parse";

      expect(() => Parser.parseSqlStatement(statement)).toThrow({ name: propertyOf(Cyberlite.CyberliteError, x => x.UNKNOWN_COMMAND), message: statement })
    })
  })

  describe(".validateCharacterLength", () => {
    it("defines a function", () => {
      expect(typeof parser.validateCharacterLength).toBe("function")
    })

    it("allows valid input", () => {
      const username = parser.validateCharacterLength("a".repeat(35), 35, "username")
      const email = parser.validateCharacterLength("a".repeat(255), 255, "email")

      expect(username).toBeUndefined()
      expect(email).toBeUndefined()
    })

    it("throws INVALID_SYNTAX", () => {
      const invalidUsername = "a".repeat(10_000)
      const invalidEmail = "a".repeat(10_000)
      const msg = (prop: string, len: number) => `'${prop}' must not be longer than '${len}' characters`

      try {
        parser.validateCharacterLength(invalidUsername, 35, "username")
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.INVALID_SYNTAX), message: msg("username", 35) })
      }

      try {
        parser.validateCharacterLength(invalidEmail, 255, "email")
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.INVALID_SYNTAX), message: msg("email", 255) })
      }
    })
  })

  describe(".parseCommand", () => {
    it("defines a function", () => {
      expect(typeof parser.parseCommand).toBe("function")
    })

    it("throws empty insert statement", () => {
      try {
        parser.parseCommand(undefined)
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.INVALID_SYNTAX), message: "Empty 'insert' statement provided" })
      }
    })

    it("throws missing username", () => {
      try {
        parser.parseCommand("1")
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.MISSING_PROP), message: "username" })
      }
    })

    it("throws missing email", () => {
      try {
        parser.parseCommand("1 user1")
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.MISSING_PROP), message: "email" })
      }
    })

    it("throws id must be positive", () => {
      try {
        parser.parseCommand("0 user1 email1")
      } catch (err) {
        expect({ name: err.name, message: cleanText(err.message)}).toEqual({ name: propertyOf(Cyberlite.CyberliteError, x => x.INVALID_SYNTAX), message: "'id' must be positive" })
      }
    })
  })

  describe(".serialize", () => {
    it("copies table data to buffer", () => {
      const row = { id: "1", username: "user1", email: "email1"}
      const buf = Buffer.alloc(Database.MAX_ROW_SIZE)
      parser.serialize(row, buf, 0);

      expect(cleanText(buf.toString())).toBe("1 user1 email1")
    })
  })

  describe(".deserialize", () => {
    it("converts byte data to display string", () => {
      const row = { id: "1", username: "user1", email: "email1"}
      const buf = Buffer.alloc(Database.MAX_ROW_SIZE)
      parser.serialize(row, buf, 0);

      expect(parser.deserialize(buf, 0)).toEqual(["1", "user1", "email1"])
    })
  })
})
