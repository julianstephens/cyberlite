import chalk from "chalk";
import {
  CommandStatus,
  ExecuteError,
  ExecuteStatement,
  ExecuteStatus,
  Row,
  SqlStatement,
  Table,
} from "./types";
import {
  COMMAND_STATUS,
  EXECUTE_STATUS,
  PAGE_SIZE,
  MAX_ROW_SIZE,
  SQL_STATEMENT_TYPE,
  TABLE_MAX_PAGES,
  deserialize,
  isExecuteError,
  printHelp,
  printMissing,
  printRow,
  serialize,
  getExecutionTime,
} from "./utils";

export const executeMetaCommand = (command: string): CommandStatus => {
  if (/^\.help/.test(command)) {
    printHelp();
    return COMMAND_STATUS.SUCCESS;
  }
  if (/^\.clear/.test(command)) {
    console.clear();
    return COMMAND_STATUS.SUCCESS;
  }

  return COMMAND_STATUS.UNKNOWN;
};

export const handleExecuteError = (error: ExecuteError) => {
  switch (error.status) {
    case EXECUTE_STATUS.TABLE_FULL:
      console.log(`${chalk.red("Error:")} Table full`);
      break;
    case EXECUTE_STATUS.MISSING_PROP:
      printMissing(error.message);
      break;
    default:
      console.log(
        `${chalk.red("Syntax Error:")} ${
          error.message || "Could not parse statement"
        }`,
      );
      break;
  }
};

const validateCharacterLength = (
  text: string,
  maxCharacters: number,
  prop: string,
): ExecuteError | null => {
  return text.length > maxCharacters
    ? {
        status: EXECUTE_STATUS.INVALID_SYNTAX,
        message: `'${chalk.red(prop)}' must not be longer than '${chalk.yellow(
          maxCharacters,
        )}' characters`,
      }
    : null;
};

const validateCommand = (command?: string): Row | ExecuteError | void => {
  let foundMissing = false;
  if (!command)
    return {
      status: EXECUTE_STATUS.INVALID_SYNTAX,
      message: "Empty 'insert' statement provided",
    };
  const [id, username, email] = command
    .trim()
    .split(" ")
    .filter((el) => el)
    .map((el) => el.trim());

  if (!id) return { status: EXECUTE_STATUS.MISSING_PROP, message: "id" };
  if (!username)
    return { status: EXECUTE_STATUS.MISSING_PROP, message: "username" };
  if (!email) return { status: EXECUTE_STATUS.MISSING_PROP, message: "email" };

  if (!Number.parseInt(id) || Number.parseInt(id) < 0)
    return {
      status: EXECUTE_STATUS.INVALID_SYNTAX,
      message: `'${chalk.red("id")}' must be positive`,
    };

  const idError = validateCharacterLength(id, 4, "id");
  if (idError) return idError;
  const usernameError = validateCharacterLength(username, 35, "username");
  if (usernameError) return usernameError;
  const emailError = validateCharacterLength(email, 255, "email");
  if (emailError) return emailError;

  const rawArgs: Row = {
    id,
    username,
    email,
  };
  Object.entries(rawArgs).forEach(([k, v]) => {
    if (!v) {
      printMissing(k);
      if (!foundMissing) foundMissing = true;
    }
  });

  if (foundMissing)
    return {
      status: EXECUTE_STATUS.INVALID_SYNTAX,
      message: "See above for missing parameters",
    };

  return rawArgs;
};

const getRowSlot = (
  table: Table,
  rowNum: number,
): [number, Buffer, number, Table] => {
  const pageNum = ~~(rowNum / table.rowsPerPage);
  let page = table.pages[pageNum];
  const rowOffset = rowNum % table.rowsPerPage;
  const byteOffset = rowOffset * MAX_ROW_SIZE;
  if (!page) page = table.pages[pageNum] = Buffer.alloc(PAGE_SIZE);
  return [pageNum, page, byteOffset, table];
};

const executeInsert = (
  statement: ExecuteStatement,
  table: Table,
): [ExecuteStatus, Table] | ExecuteError => {
  if (table.numRows >= 4) {
    return { status: EXECUTE_STATUS.TABLE_FULL };
  }

  const [pageNum, page, cursor, t] = getRowSlot(table, table.numRows);
  table = t;
  serialize(statement.row, page, cursor);
  table.pages[pageNum] = page;
  table.numRows++;

  return [EXECUTE_STATUS.SUCCESS, table];
};

const executeSelect = (table: Table) => {
  for (let i = 0; i < table.numRows; i++) {
    const [_, page, cursor] = getRowSlot(table, i);
    printRow(deserialize(page, cursor));
  }
  return EXECUTE_STATUS.SUCCESS;
};

export const execute = (statement: SqlStatement, table: Table) => {
  const startTime = process.hrtime.bigint();
  let executionResult: ExecuteStatus | [ExecuteStatus, Table] | ExecuteError;

  switch (statement.type) {
    case SQL_STATEMENT_TYPE.INSERT:
      const res = validateCommand(statement.command);
      if (isExecuteError(res)) return handleExecuteError(res as ExecuteError);

      executionResult = executeInsert(
        { ...statement, row: res } as ExecuteStatement,
        table,
      );
      if (!isExecuteError(executionResult)) table = executionResult[1];
      break;
    case SQL_STATEMENT_TYPE.SELECT:
      executionResult = executeSelect(table);
      break;
  }
  if (isExecuteError(executionResult)) {
    return handleExecuteError(executionResult as ExecuteError);
  }
  console.log(chalk.green(`\nExecuted (${getExecutionTime(startTime)}ms)`));
  return table;
};

export const createTable = (): Table => {
  const rowsPerPage = ~~(PAGE_SIZE / MAX_ROW_SIZE);
  return {
    rowsPerPage,
    maxRows: rowsPerPage * TABLE_MAX_PAGES,
    numRows: 0,
    pages: Array.apply(null, {
      length: TABLE_MAX_PAGES,
    }),
  };
};
