import chalk from "chalk";
import convertHrtime from "convert-hrtime";
import logger from "./logger";
import Parser from "./parser";
import Table from "./table";
import { ExecuteStatement, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { SQL_STATEMENT_TYPE, propertyOf } from "./utils";

/** Executes statements and commits to page cache */
export default class VM {
  parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  #getExecutionTime = (time: bigint) =>
    convertHrtime(process.hrtime.bigint() - time).milliseconds.toFixed(2);

  #executeInsert = async (
    statement: ExecuteStatement,
    table: Table,
  ): Promise<CB.CyberliteStatus> => {
    if (table.numRows >= table.maxRows) {
      logger.error(propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL));
      return propertyOf(CB.CyberliteError, (x) => x.TABLE_FULL);
    }

    const [pageNum, page, cursor] = await table.getRowSlot(table.numRows);
    this.parser.serialize(statement.row, page, cursor);
    table.pager.pages[pageNum] = page;
    table.numRows = table.numRows + 1;

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  };

  #executeSelect = async (table: Table): Promise<CB.CyberliteStatus> => {
    let pageNum = 0;
    for (let i = 0; i < table.numRows; i++) {
      pageNum = ~~(i / table.rowsPerPage);
      const page = table.pager.pages[pageNum];
      const [, p, cursor] = await table.getRowSlot(i);
      const useCachedPage = !page || !page.equals(Buffer.alloc(page.length));
      logger.log(this.parser.deserialize(useCachedPage ? page : p, cursor));
    }

    return propertyOf(CB.Result.Execution, (x) => x.OK);
  };

  /**
   * Performs command on targeted table
   * @param statement formatted user input
   * @param table table to execute on
   * @returns modified table
   */
  execute = async (statement: SqlStatement, table: Table) => {
    const startTime = process.hrtime.bigint();
    let executionResult: CB.CyberliteStatus;

    switch (statement.type) {
      case SQL_STATEMENT_TYPE.INSERT:
        try {
          const res = this.parser.parseCommand(statement.command);
          executionResult = await this.#executeInsert(
            { ...statement, row: res } as ExecuteStatement,
            table,
          );
        } catch (err) {
          logger.error(err.name, {
            ...(err.name ===
            propertyOf(CB.CyberliteError, (x) => x.MISSING_PROP)
              ? { prop: err.message }
              : { message: err.message }),
          });
          return undefined;
        }
        break;
      case SQL_STATEMENT_TYPE.SELECT:
        executionResult = await this.#executeSelect(table);
        break;
      default:
        executionResult = "UNKNOWN_COMMAND";
        break;
    }

    if (executionResult !== propertyOf(CB.Result.Execution, (x) => x.OK)) {
      const prop =
        executionResult === "UNKNOWN_COMMAND" ? statement.type : undefined;
      logger.error(executionResult as CB.CyberliteErrorStatus, {
        prop,
      });
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
    if (/^\.help/.test(command)) {
      logger.help();
      return propertyOf(CB.Result.Execution, (x) => x.OK);
    }
    if (/^\.clear/.test(command)) {
      console.clear();
      return propertyOf(CB.Result.Execution, (x) => x.OK);
    }

    return propertyOf(CB.CyberliteError, (x) => x.UNKNOWN_COMMAND);
  };
}
