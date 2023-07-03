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
  printUnknownInput,
  serialize,
  getExecutionTime,
} from "./utils";

export const handleMetaCommand = (command: string): CommandStatus => {
  if (/^\.help/.test(command)) {
    printHelp();
    return COMMAND_STATUS.SUCCESS;
  }
  if (/^\.clear/.test(command)) {
    console.clear();
    return COMMAND_STATUS.SUCCESS;
  }
  if (/^\.exit/.test(command)) {
    console.log("Goodbye!");
    process.exit();
  }

  return COMMAND_STATUS.UNKNOWN;
};

export const handleExecuteError = (error: ExecuteError) => {
  switch (error.status) {
    case EXECUTE_STATUS.TABLE_FULL:
      console.log(`${chalk.red("Error:")} Table full`);
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

  const idError = validateCharacterLength(id, 4, "id");
  if (idError) return handleExecuteError(idError);
  const usernameError = validateCharacterLength(username, 35, "username");
  if (usernameError) return handleExecuteError(usernameError);
  const emailError = validateCharacterLength(email, 255, "email");
  if (emailError) return handleExecuteError(emailError);

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

const getRowSlot = (table: Table, rowNum: number): [number, Buffer, number] => {
  const pageNum = ~~(rowNum / table.rowsPerPage);
  let page = table.pages[pageNum];
  const rowOffset = rowNum % table.rowsPerPage;
  const byteOffset = rowOffset * MAX_ROW_SIZE;
  if (!page) page = table.pages[pageNum] = Buffer.alloc(PAGE_SIZE);
  return [pageNum, page, byteOffset];
};

const executeInsert = (
  statement: ExecuteStatement,
  table: Table,
): ExecuteStatus | ExecuteError => {
  if (table.numRows >= MAX_ROW_SIZE * table.rowsPerPage) {
    return { status: EXECUTE_STATUS.TABLE_FULL };
  }
  const [pageNum, page, cursor] = getRowSlot(table, table.numRows);
  serialize(statement.row, page, cursor);
  table.pages[pageNum] = page;
  table.numRows++;

  return EXECUTE_STATUS.SUCCESS;
};

const executeSelect = (table: Table) => {
  for (let i = 0; i < table.numRows; i++) {
    const [_, page, cursor] = getRowSlot(table, i);
    printRow(deserialize(page, cursor, i));
  }
  return EXECUTE_STATUS.SUCCESS;
};

export const execute = (statement: SqlStatement, table: Table) => {
  const startTime = process.hrtime.bigint();
  let executionResult: ExecuteStatus | ExecuteError;
  switch (statement.type) {
    case SQL_STATEMENT_TYPE.INSERT:
      const res = validateCommand(statement.command);
      if (isExecuteError(res)) return handleExecuteError(res as ExecuteError);

      executionResult = executeInsert(
        { ...statement, row: res } as ExecuteStatement,
        table,
      );
      break;
    case SQL_STATEMENT_TYPE.SELECT:
      executionResult = executeSelect(table);
      break;
    default:
      if (isExecuteError(executionResult)) {
        return handleExecuteError(executionResult as ExecuteError);
      }
      break;
  }
  console.log(chalk.green(`\nExecuted (${getExecutionTime(startTime)}ms)`));
};

export const createTable = (): Table => {
  return {
    rowsPerPage: ~~(PAGE_SIZE / MAX_ROW_SIZE),
    numRows: 0,
    pages: Array.apply(null, {
      length: TABLE_MAX_PAGES,
    }),
  };
};
