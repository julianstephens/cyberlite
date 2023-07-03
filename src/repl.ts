import {
  COMMAND_STATUS,
  WELCOME_MSG,
  parseSqlStatement,
  printUnknownInput,
} from "@/utils";
import { createTable, execute, executeMetaCommand } from "./executor";
import { Readline, Table } from "./types";

const defaultPrompt = "\n> ";

export const handleMetaCommand = (
  rl: Readline,
  command: string,
  table: Table,
) => {
  if (/^\.exit/.test(`${command}`)) {
    console.log("Goodbye!");
    process.exit();
  } else {
    switch (executeMetaCommand(`${command}`)) {
      case COMMAND_STATUS.SUCCESS:
        repl(defaultPrompt, rl, table);
        break;
      case COMMAND_STATUS.UNKNOWN:
        console.log("here");
        printUnknownInput("command", `${command}`);
        repl(defaultPrompt, rl, table);
        break;
    }
  }
};

export const repl = (prompt: string, rl: Readline, table: Table) => {
  rl.question(prompt, (command: string) => {
    if (/^\./.test(`${command}`)) {
      handleMetaCommand(rl, command, table);
    } else {
      const res = execute(parseSqlStatement(`${command}`), table);
      if (res) table = res
      repl(defaultPrompt, rl, table);
    }
  });
};

export const startRepl = (rl: Readline) => {
  console.log(WELCOME_MSG);
  const table = createTable();
  repl(defaultPrompt, rl, table);
};
