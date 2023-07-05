import readline from "node-color-readline";
import Database from "./database";
import logger from "./logger";
import Parser from "./parser";
import { Readline } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { colorize, COMPLETIONS, propertyOf } from "./utils";
import VM from "./vm";

/** Interactive REPL for Cyberlite */
export default class CyberliteRepl {
  readonly rl: Readline;
  readonly db: Database;
  readonly #prompt = "\n> ";
  readonly vm: VM;

  constructor(filename = "./db") {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      colorize,
      completer: (line: string) => {
        const hits = COMPLETIONS.filter((c) => c.startsWith(line));
        return [hits.length ? hits : COMPLETIONS, line];
      },
    });
    this.db = new Database();
    this.db.open(filename);
    this.vm = new VM();
  }

  /** Loops REPL session until terminated by user */
  run = () => {
    this.rl.question(this.#prompt, async (command: string) => {
      if (/^\./.test(`${command}`)) {
        const res = this.vm.executeMetaCommand(command);
        if (res !== propertyOf(CB.Result.Execution, (x) => x.OK)) {
          logger.error(res as CB.CyberliteErrorStatus);
        }
      } else {
        try {
          const statement = Parser.parseSqlStatement(`${command}`);
          const res = await this.vm.execute(statement, this.db.tables[0]);
          if (res) this.db.tables[0] = res;
        } catch (err) {
          logger.error(err.name, err.message);
        }
      }
      this.run();
    });
  };

  /** Starts REPL session */
  start = () => {
    logger.welcome();
    this.run();
  };
}
