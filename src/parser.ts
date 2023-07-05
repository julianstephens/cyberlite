import chalk from "chalk";
import Database from "./database";
import logger from "./logger";
import { Row, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { SQL_STATEMENT_TYPE, propertyOf, throwError } from "./utils";

/** Formats and validates SQL statements for execution */
export default class Parser {
  /**
   * Parses SQL method and command from user input
   * @param statement user input
   * @returns statement split into modifier + command
   */
  static parseSqlStatement = (statement: string): SqlStatement => {
    if (/^insert/i.test(statement)) {
      return {
        type: SQL_STATEMENT_TYPE.INSERT,
        command: statement.slice(6),
      };
    } else if (/^select/i.test(statement)) {
      return {
        type: SQL_STATEMENT_TYPE.SELECT,
        command: statement.slice(6),
      };
    } else {
      return throwError("UNKNOWN_COMMAND", statement);
    }

    // FIXME: handle error without returning
  };

  /**
   * Ensures string is valid varchar of specified size
   * @param text data to validate
   * @param maxCharacters max character count to validate against
   * @param prop associated column name
   * @throws { name: "INVALID_SYNTAX", message: string; }
   */
  validateCharacterLength = (
    text: string,
    maxCharacters: number,
    prop: string,
  ) => {
    if (text.length > maxCharacters)
      throwError(
        propertyOf(CB.CyberliteError, (x) => x.INVALID_SYNTAX),
        `'${chalk.red(prop)}' must not be longer than '${chalk.yellow(
          maxCharacters,
        )}' characters`,
      );
  };

  /**
   * Converts parsed SQL command to table row
   * @param command user input
   * @returns formatted row for insertion
   */
  parseCommand = (command?: string): Row => {
    const missingStatus = propertyOf(CB.CyberliteError, (x) => x.MISSING_PROP);
    const invalidStatus = propertyOf(
      CB.CyberliteError,
      (x) => x.INVALID_SYNTAX,
    );
    let foundMissing = false;
    if (!command)
      throwError(invalidStatus, "Empty 'insert' statement provided");
    const [id, username, email] = command
      .trim()
      .split(" ")
      .filter((el) => el)
      .map((el) => el.trim());

    if (!id) throwError(missingStatus, "id");
    if (!username) throwError(missingStatus, "username");
    if (!email) throwError(missingStatus, "email");

    if (!Number.parseInt(id) || Number.parseInt(id) < 0)
      throwError(invalidStatus, `'${chalk.red("id")}' must be positive`);

    this.validateCharacterLength(id, 4, "id");
    this.validateCharacterLength(username, 35, "username");
    this.validateCharacterLength(email, 255, "email");

    const rawArgs: Row = {
      id,
      username,
      email,
    };
    Object.entries(rawArgs).forEach(([k, v]) => {
      if (!v) {
        logger.error(missingStatus, { prop: k });
        if (!foundMissing) foundMissing = true;
      }
    });

    return rawArgs;
  };

  /**
   * Converts table row to bytes and copies to destination buffer
   * @param source row to serialize
   * @param destination buffer to copy to
   * @param cursor offset in bytes to begin copying in destination buffer
   */
  serialize = (source: Row, destination: Buffer, cursor: number) => {
    const s = Buffer.from(Object.values(source).join(" "));
    s.copy(destination, cursor);
  };

  /**
   * Converts byte data to utf-8 strings for display
   * @param source buffer to read from
   * @param cursor offset in source to begin reading from
   * @returns table row as tuple
   */
  deserialize = (source: Buffer, cursor: number) => {
    const row = source.subarray(cursor, cursor + Database.MAX_ROW_SIZE);
    return row
      .toString()
      .trim()
      .replace(/\x00/g, "")
      .split(" ")
      .map((el) => el);
  };
}
