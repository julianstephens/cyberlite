import chalk from "chalk";
import { Cyberlite as CB } from "./types/cyberlite";

export const SQL_STATEMENT_TYPE = {
  INSERT: "insert",
  SELECT: "select",
  INVALID: "invalid",
} as const;

export const COMPLETIONS = [
  "insert",
  "select",
  ".help",
  ".clear",
  ".exit",
] as const;

export const HELP_MSG = `
${chalk.blue("cyberlite repl commands")}
${chalk.magenta.bold("insert")} <data>        add a new row to the current table
${chalk.magenta.bold("select")}        retrieve all rows from the current table
${chalk.yellow(".clear")}        clear all the code
${chalk.blue(".help")}         print this manual
${chalk.red(".exit")}         leave the repl
` as const;

export const WELCOME_MSG = `
${chalk.blue("cyberlite")}: Typescript sqlite clone
type in a command to begin
type ${chalk.magenta(".help")} for a list of repl commands
` as const;

export const throwError = (err: CB.CyberliteErrorStatus, message: string) => {
  function error(message = "") {
    this.name = err;
    this.message = message;
  }
  error.prototype = new Error();

  throw { name: err, message };
};

export const colorize = (line: string) => {
  let colorized = "";
  const regex: [RegExp, string][] = [
    [/\/\/.*$/m, "grey"], // comment
    [/(['"`/]).*?(?!<\\)\1/, "cyan"], // string/regex, not rock solid
    [/[+-]?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?/, "cyan"], // number
    [/\b(true|false|null|undefined|NaN|Infinity)\b/, "blue"],
    [/\b(insert|select)\b/, "magenta"],
  ];

  while (line !== "") {
    let start = +Infinity;
    let color = "";
    let length = 0;
    regex.forEach((reg) => {
      const match = reg[0].exec(line);
      if (match && match.index < start) {
        start = match.index;
        color = reg[1];
        length = match[0].length;
      }
    });
    colorized += line.slice(0, start);
    if (color) colorized += chalk[color](line.slice(start, start + length));
    line = line.slice(start + length);
  }
  return colorized;
};

/** Returns string representation of object key */
export const propertyOf = <T extends object>(
  o: T,
  expression: (x: { [Property in keyof T]: string }) => string,
): keyof T => {
  const res = {} as { [Property in keyof T]: string };
  Object.keys(o).map((k) => (res[k as keyof T] = k));
  return expression(res) as keyof T;
};
