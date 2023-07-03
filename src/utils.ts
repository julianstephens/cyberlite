import chalk from "chalk";
import { CommandType, ExecuteError, Row } from "./types";

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

export const sizeof = (val: string) => {
  return Buffer.byteLength(Buffer.from(val));
};

export const toVarchar = (text: string, length: number, prop: string) => {
  const varchar = Array.apply(null, { length }).map((_, idx) => text[idx]);
  if (varchar.join("") !== text)
    return {
      status: EXECUTE_STATUS.INVALID_SYNTAX,
      message: `'${chalk.red(prop)}' must not be longer than '${chalk.yellow(
        length,
      )}' characters`,
    };
  return varchar;
};

export const fromVarchar = (text: string) => text.replaceAll(",", "");

export const serialize = (
  source: Row,
  destination: Buffer,
  pageCursor: number,
) => {
  const s = Buffer.from(Object.values(source).join(" "));
  s.copy(destination, 0, pageCursor, Buffer.byteLength(s));
};

export const deserialize = (source: Buffer) => {
  return source
    .toString()
    .split(" ")
    .map((el) => fromVarchar(el));
};

export const PAGE_SIZE = 4096;
export const TABLE_MAX_PAGES: number = 100;
export const ROW_SIZE = 291;
