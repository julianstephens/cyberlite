import chalk from "chalk";
import convertHrtime from "convert-hrtime";
import Database from "./database";
import logger from "./logger";
import Parser from "./parser";
import Table from "./table";
import { InsertStatement, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

/** Executes statements and commits to page cache */
export default class VM {
  parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  #getExecutionTime(time: bigint) {
    return convertHrtime(process.hrtime.bigint() - time).milliseconds.toFixed(
      2,
    );
  }

  async #executeInsert(
    statement: InsertStatement,
    table: Table,
  ): Promise<CB.CyberliteStatus> {
    if (table.numRows >= table.maxRows) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      return propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL);
    }

    const [pageNum, page, cursor] = await table.getRowOffset("end");
    this.parser.serialize(statement.data, page, cursor);
    table.pager.pages[pageNum] = page;
    table.numRows = table.numRows + 1;
    table.endCursor.advance(table.numRows);

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  }

  async #executeSelect(
    _statement: SqlStatement,
    table: Table,
  ): Promise<CB.CyberliteStatus> {
    table.startCursor.reset();

    while (!table.startCursor.isTableEnd) {
      const [pageNum, page, offset] = await table.getRowOffset("start");

      if (
        !pageNum &&
        !offset &&
        page.equals(Buffer.alloc(Database.PAGE_SIZE))
      ) {
        return propertyOf(CB.CyberliteError, (x) => x.TABLE_EMPTY);
      }

      logger.log(this.parser.deserialize(page, offset));
      table.startCursor.advance(table.numRows);
    }

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  }

  /**
   * Performs command on targeted table
   * @param statement formatted user input
   * @param table table to execute on
   * @returns modified table
   */
  async execute(statement: SqlStatement, table: Table) {
    const startTime = process.hrtime.bigint();
    let executionResult: CB.CyberliteStatus;

    switch (statement.method) {
      case CB.SQL_STATEMENT_METHOD.INSERT:
        try {
          const res = this.parser.parseCommand(statement.command);
          executionResult = await this.#executeInsert(
            { ...statement, data: res } as InsertStatement,
            table,
          );
        } catch (err) {
          logger.error(err.name, {
            ...(err.name ===
            propertyOf(CB.CyberliteError, (x) => x.MISSING_PROP)
              ? { prop: err.message }
              : { message: err.message }),
            useDefault: true,
          });
          return undefined;
        }
        break;
      case CB.SQL_STATEMENT_METHOD.SELECT:
        executionResult = await this.#executeSelect(
          { method: "select", command: "*" },
          table,
        );
        break;
      default:
        executionResult = propertyOf(
          CB.CyberliteError,
          (x) => x.UNKNOWN_COMMAND,
        );
        break;
    }

    if (executionResult !== propertyOf(CB.Result.Execution, (x) => x.OK)) {
      const prop =
        executionResult === "UNKNOWN_COMMAND" ? statement.method : undefined;
      logger.error(executionResult as CB.CyberliteErrorStatus, {
        prop,
        useDefault: true,
      });
      return undefined;
    }

    logger.log(
      chalk.green(`\nExecuted (${this.#getExecutionTime(startTime)}ms)`),
    );
    return table;
  }

  /**
   * Executes helper function
   * @param command helper function to execute
   * @returns OK or UNKNOWN_COMMAND
   */
  executeMetaCommand(command: string): CB.CyberliteStatus {
    if (/^\.help/.test(command)) {
      logger.help();
      return propertyOf(CB.Result.Execution, (x) => x.OK);
    }
    if (/^\.clear/.test(command)) {
      console.clear();
      return propertyOf(CB.Result.Execution, (x) => x.OK);
    }

    return propertyOf(CB.CyberliteError, (x) => x.UNKNOWN_COMMAND);
  }
}
