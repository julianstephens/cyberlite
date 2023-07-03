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
  ROW_SIZE,
  SQL_STATEMENT_TYPE,
  TABLE_MAX_PAGES,
  deserialize,
  isExecuteError,
  printHelp,
  printMissing,
  printRow,
  printUnknownInput,
  serialize,
  sizeof,
  toVarchar,
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

export const parseSqlStatement = (statement: string): SqlStatement => {
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

  printUnknownInput("keyword", statement);

  return {
    type: SQL_STATEMENT_TYPE.INVALID,
  };
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

  const usernameVarchar = toVarchar(username, 32, "username");
  if (isExecuteError(usernameVarchar))
    return handleExecuteError(usernameVarchar);
  const emailVarchar = toVarchar(email, 255, "email");
  if (isExecuteError(emailVarchar)) return handleExecuteError(emailVarchar);
  const idVarchar = toVarchar(id, 4, "id");
  if (isExecuteError(idVarchar)) return handleExecuteError(idVarchar);

  const rawArgs: Row = {
    id: idVarchar,
    username: usernameVarchar,
    email: emailVarchar,
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

const getRowSlot = (table: Table, rowNum: number): [Buffer, number] => {
  const rowsPerPage = ~~(PAGE_SIZE / ROW_SIZE);
  const pageNum = ~~(rowNum / rowsPerPage);
  let page = table.pages[pageNum];
  const rowOffset = rowNum % rowsPerPage;
  const byteOffset = rowOffset * ROW_SIZE;
  if (!page) page = table.pages[pageNum] = Buffer.alloc(ROW_SIZE);
  return [page, byteOffset];
};

const executeInsert = (
  statement: ExecuteStatement,
  table: Table,
): ExecuteStatus | ExecuteError => {
  if (table.numRows >= ROW_SIZE * table.rowsPerPage) {
    return { status: EXECUTE_STATUS.TABLE_FULL };
  }

  serialize(statement.row, ...getRowSlot(table, table.numRows));
  table.numRows++;

  return EXECUTE_STATUS.SUCCESS;
};

const executeSelect = (table: Table) => {
  for (let i = 0; i < table.numRows; i++) {
    printRow(deserialize(getRowSlot(table, i)[0]));
  }
  return EXECUTE_STATUS.SUCCESS;
};

export const execute = (statement: SqlStatement, table: Table) => {
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
  console.log(chalk.green("\nExecuted"));
};

export const createTable = (): Table => {
  return {
    rowsPerPage:
      PAGE_SIZE /
      (sizeof(Array.apply(",", { length: 32 })) +
        sizeof(Array.apply(",", { length: 255 })) +
        sizeof(Array.apply(",", { length: 4 }))),
    numRows: 0,
    pages: Array.apply(null, {
      length: TABLE_MAX_PAGES,
    }),
  };
};
