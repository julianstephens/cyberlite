import chalk from "chalk";
import convertHrtime from "convert-hrtime";
import { exit } from "process";
import Database from "./cyberlite";
import logger from "./logger";
import Parser from "./parser";
import Table from "./table";
import { ExecuteStatement, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { SQL_STATEMENT_TYPE, propertyOf } from "./utils";

/** Executes statements and commits to page cache */
export default class VM {
  table: Table;
  parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  #getExecutionTime = (time: bigint) =>
    convertHrtime(process.hrtime.bigint() - time).milliseconds.toFixed(2);

  #executeInsert = (
    statement: ExecuteStatement,
    table: Table,
  ): CB.CyberliteStatus => {
    if (table.numRows >= 4) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      return propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL);
    }

    const [pageNum, page, cursor] = table.getRowSlot(table.numRows);
    this.parser.serialize(statement.row, page, cursor);
    table.pager.pages[pageNum] = page;
    table.numRows++;

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  };

  #executeSelect = (table: Table): CB.CyberliteStatus => {
    for (let i = 0; i < table.numRows; i++) {
      const [_, page, cursor] = table.getRowSlot(i);
      logger.log(this.parser.deserialize(page, cursor));
    }

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  };

  /**
   * Performs command on targeted table
   * @param statement formatted user input
   * @param table table to execute on
   * @returns modified table
   */
  execute = (statement: SqlStatement, table: Table) => {
    const startTime = process.hrtime.bigint();
    let executionResult: CB.CyberliteStatus;

    switch (statement.type) {
      case SQL_STATEMENT_TYPE.INSERT:
        try {
          const res = this.parser.parseCommand(statement.command);
          executionResult = this.#executeInsert(
            { ...statement, row: res } as ExecuteStatement,
            table,
          );
        } catch (err) {
          logger.error(err.name, err.message);
          return undefined;
        }
        break;
      case SQL_STATEMENT_TYPE.SELECT:
        executionResult = this.#executeSelect(table);
        break;
    }

    if (executionResult !== propertyOf(CB.Result.Execution, (x) => x.OK)) {
      logger.error(executionResult as CB.CyberliteErrorStatus);
      return undefined;
    }

    logger.log(
      chalk.green(`\nExecuted (${this.#getExecutionTime(startTime)}ms)`),
    );
    return table;
  };

  /**
   * Executes helper function
   * @param command helper function to execute
   * @returns OK or UNKNOWN_COMMAND
   */
  executeMetaCommand = (command: string): CB.CyberliteStatus => {
    if (/^\.exit/.test(`${command}`)) {
      logger.log("Goodbye!");
      Database.close(this.table).catch((err) => {
        logger.error(
          propertyOf(CB.CyberliteError, (x) => x.CYBERLITE_INTERNAL),
          {
            message: err.message,
          },
        );
        exit(1);
      });
      process.exit();
    } else {
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
  };
}
