import {
  COMMAND_STATUS,
  COMPLETIONS,
  WELCOME_MSG,
  parseSqlStatement,
  printUnknownInput,
} from "@/utils";
import chalk from "chalk";
import readline from "node-color-readline";
import { createTable, execute, handleMetaCommand } from "./executor";

const table = createTable();
const colorize = (line: string) => {
  let colorized = "";
  let regex: [RegExp, string][] = [
    [/\/\/.*$/m, "grey"], // comment
    [/(['"`\/]).*?(?!<\\)\1/, "cyan"], // string/regex, not rock solid
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

const createReadLine = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    colorize: colorize,
    completer: (line: string) => {
      const hits = COMPLETIONS.filter((c) => c.startsWith(line));
      return [hits.length ? hits : COMPLETIONS, line];
    },
  });
};

let rl = createReadLine();

const defaultPrompt = "\n> ";

const repl = (prompt: string) => {
  rl.question(prompt, (command: number) => {
    if (/^\./.test(`${command}`)) {
      switch (handleMetaCommand(`${command}`)) {
        case COMMAND_STATUS.SUCCESS:
          return repl(defaultPrompt);
        case COMMAND_STATUS.UNKNOWN:
          printUnknownInput("command", `${command}`);
          return repl(defaultPrompt);
      }
    }

    execute(parseSqlStatement(`${command}`), table);

    return repl(defaultPrompt);
  });
};

export const startRepl = () => {
  console.log(WELCOME_MSG);
  repl(defaultPrompt);
};
