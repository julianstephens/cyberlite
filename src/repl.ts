import readline from "node-color-readline";
import Cyberlite from "./cyberlite";
import logger from "./logger";
import Parser from "./parser";
import { Readline } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { colorize, COMPLETIONS } from "./utils";
import VM from "./vm";

export default class CyberliteRepl {
  rl: Readline;
  db: Cyberlite;
  prompt = "\n> ";
  vm: VM;

  constructor(filename: string) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      colorize,
      completer: (line: string) => {
        const hits = COMPLETIONS.filter((c) => c.startsWith(line));
        return [hits.length ? hits : COMPLETIONS, line];
      },
    });
    this.db = new Cyberlite();
    this.db.open(filename);
    this.vm = new VM();
  }

  run = () => {
    this.rl.question(this.prompt, (command: string) => {
      if (/^\./.test(`${command}`)) {
        const res = this.vm.executeMetaCommand(command);
        if (res !== CB.CyberliteStatus) {
          logger.error(res);
        }
      } else {
        try {
          const statement = Parser.parseSqlStatement(`${command}`);
          const res = this.vm.execute(statement, this.db.tables[0]);
          if (res) this.db.tables[0] = res;
        } catch (err) {
          logger.error(err.name, err.message);
        }
      }
      this.run();
    });
  };

  start = () => {
    logger.welcome();
    this.run();
  };
}
