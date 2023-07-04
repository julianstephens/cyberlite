import chalk from "chalk";
import Cyberlite from "./cyberlite";
import logger from "./logger";
import { Row, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { SQL_STATEMENT_TYPE, throwError } from "./utils";

export default class Parser {
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
    }
    // FIXME: handle error without returning
  };

  validateCharacterLength = (
    text: string,
    maxCharacters: number,
    prop: string,
  ) => {
    if (text.length > maxCharacters)
      throwError(
        CB.Error.Execution.INVALID_SYNTAX,
        `'${chalk.red(prop)}' must not be longer than '${chalk.yellow(
          maxCharacters,
        )}' characters`,
      );
  };

  validateCommand = (command?: string): Row => {
    let foundMissing = false;
    if (!command)
      throwError(
        CB.Error.Execution.INVALID_SYNTAX,
        "Empty 'insert' statement provided",
      );
    const [id, username, email] = command
      .trim()
      .split(" ")
      .filter((el) => el)
      .map((el) => el.trim());

    if (!id) throwError(CB.Error.Execution.MISSING_PROP, "id");
    if (!username) throwError(CB.Error.Execution.MISSING_PROP, "username");
    if (!email) throwError(CB.Error.Execution.MISSING_PROP, "email");

    if (!Number.parseInt(id) || Number.parseInt(id) < 0)
      throwError(
        CB.Error.Execution.INVALID_SYNTAX,
        `'${chalk.red("id")}' must be positive`,
      );

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
        logger.error(CB.Error.Execution.MISSING_PROP, { prop: k });
        if (!foundMissing) foundMissing = true;
      }
    });

    return rawArgs;
  };

  serialize = (source: Row, destination: Buffer, cursor: number) => {
    const s = Buffer.from(Object.values(source).join(" "));
    s.copy(destination, cursor);
  };

  deserialize = (source: Buffer, cursor: number) => {
    const row = source.subarray(cursor, cursor + Cyberlite.MAX_ROW_SIZE);
    return row
      .toString()
      .trim()
      .replace(/\x00/g, "")
      .split(" ")
      .map((el) => el);
  };
}
