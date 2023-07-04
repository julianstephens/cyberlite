import chalk from "chalk";
import convertHrtime from "convert-hrtime";
import { exit } from "process";
import Cyberlite from "./cyberlite";
import logger from "./logger";
import Parser from "./parser";
import Table from "./table";
import { ExecuteStatement, SqlStatement } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { SQL_STATEMENT_TYPE } from "./utils";

export default class VM {
  table: Table;
  parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  execute = (statement: SqlStatement, table: Table) => {
    const startTime = process.hrtime.bigint();
    let executionResult: CB.CyberliteStatus;

    switch (statement.type) {
      case SQL_STATEMENT_TYPE.INSERT:
        try {
          const res = this.parser.validateCommand(statement.command);
          executionResult = this.#executeInsert(
            { ...statement, row: res } as ExecuteStatement,
            table,
          );
        } catch (err) {
          return logger.error(err.name, err.message);
        }
        break;
      case SQL_STATEMENT_TYPE.SELECT:
        executionResult = this.#executeSelect(table);
        break;
    }

    if (executionResult !== CB.Result.Execution.OK) {
      return logger.error(executionResult);
    }

    logger.log(
      chalk.green(`\nExecuted (${this.#getExecutionTime(startTime)}ms)`),
    );
    return table;
  };

  executeMetaCommand = (command: string): CB.CyberliteStatus => {
    if (/^\.exit/.test(`${command}`)) {
      console.log("Goodbye!");
      Cyberlite.close(this.table).catch((err) => {
        logger.error(CB.Error.System.CYBERLITE_INTERNAL, {
          message: err.message,
        });
        exit(1);
      });
      process.exit();
    } else {
      if (/^\.help/.test(command)) {
        logger.help();
        return CB.Result.Execution.OK;
      }
      if (/^\.clear/.test(command)) {
        console.clear();
        return CB.Result.Execution.OK;
      }

      return CB.Error.Execution.UNKNOWN_COMMAND;
    }
  };

  #getExecutionTime = (time: bigint) =>
    convertHrtime(process.hrtime.bigint() - time).milliseconds.toFixed(2);

  #executeInsert = (
    statement: ExecuteStatement,
    table: Table,
  ): CB.CyberliteStatus => {
    if (table.numRows >= 4) {
      logger.error(CB.Error.Execution.TABLE_FULL);
      return CB.Error.Execution.TABLE_FULL;
    }

    const [pageNum, page, cursor] = table.getRowSlot(table.numRows);
    this.parser.serialize(statement.row, page, cursor);
    table.pager.pages[pageNum] = page;
    table.numRows++;

    return CB.Result.Execution.OK;
  };

  #executeSelect = (table: Table) => {
    for (let i = 0; i < table.numRows; i++) {
      const [_, page, cursor] = table.getRowSlot(i);
      logger.log(this.parser.deserialize(page, cursor));
    }

    return CB.Result.Execution.OK;
  };
}
