import chalk from "chalk";
import { CommandType, ExecuteError, Row, SqlStatement } from "./types";
import convertHrtime from "convert-hrtime";

export const assign = (dest: object, src: object) => {
  Object.keys(src).forEach((k) => (dest[k] = src[k]));
};

export const COMMAND_STATUS = {
  SUCCESS: "success",
  UNKNOWN: "unknown",
} as const;

export const SQL_STATEMENT_TYPE = {
  INSERT: "insert",
  SELECT: "select",
  INVALID: "invalid",
} as const;

export const COMMAND_TYPE = {
  COMMAND: "command",
  KEYWORD: "keyword",
} as const;

export const EXECUTE_STATUS = {
  TABLE_FULL: "table full",
  INVALID_SYNTAX: "invalid syntax",
  READY: "ready",
  SUCCESS: "success",
} as const;

export const COMPLETIONS = [
  "insert",
  "select",
  ".help",
  ".clear",
  ".exit",
] as const;

export const isExecuteError = (err: unknown) => {
  if (err && (err as ExecuteError).status) return true;
  return false;
};

export const HELP_MSG = `
${chalk.blue("cyberlite repl commands")}
${chalk.yellow(".clear")}        clear all the code
${chalk.magenta(".help")}         print this manual
${chalk.red(".exit")}         leave the repl
` as const;

export const WELCOME_MSG = `
${chalk.blue("cyberlite")}: Typescript sqlite clone
type in a command to begin
type ${chalk.magenta(".help")} for a list of repl commands
` as const;

export const printHelp = () => {
  console.log(HELP_MSG);
};

export const printUnknownInput = (type: CommandType, command: string) => {
  console.log(`Unrecognized ${chalk.blue(type)} '${chalk.red(command)}'`);
};

export const printMissing = (arg: string) => {
  console.log(`Missing ${chalk.blue("param")} '${chalk.red(arg)}'`);
};

export const printRow = (result: string[]) => {
  console.log(`(${result.join(", ")})`);
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

export const serialize = (source: Row, destination: Buffer, cursor: number) => {
  const s = Buffer.from(Object.values(source).join(" "));
  s.copy(destination, cursor);
  console.log("source length", s.length);
};

export const deserialize = (source: Buffer, cursor: number, rowNum: number) => {
  const row = source.subarray(cursor, cursor + MAX_ROW_SIZE);
  return row
    .toString()
    .trim()
    .split(" ")
    .map((el) => el);
};

export const getExecutionTime = (time: BigInt) =>
  convertHrtime(process.hrtime.bigint() - time).milliseconds.toFixed(2);

export const PAGE_SIZE = 4096;
export const TABLE_MAX_PAGES: number = 100;
export const MAX_ROW_SIZE = 1167;
