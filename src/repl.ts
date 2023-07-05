import readline from "node-color-readline";
import { exit } from "process";
import Database from "./database";
import logger from "./logger";
import Parser from "./parser";
import { Readline } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { colorize, COMPLETIONS, propertyOf } from "./utils";

/** Interactive REPL for Cyberlite */
export default class CyberliteRepl {
  readonly rl: Readline;
  readonly db: Database;
  readonly #prompt = "\n> ";

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
  }

  /** Loops REPL session until terminated by user */
  run = () => {
    this.rl.question(this.#prompt, async (command: string) => {
      if (/^\./.test(`${command}`)) {
        if (/^\.exit/.test(`${command}`)) {
          this.db.close();
          logger.log("Goodbye!");
          exit();
        }

        const res = this.db.vm.executeMetaCommand(command);
        if (res !== propertyOf(CB.Result.Execution, (x) => x.OK)) {
          logger.error(res as CB.CyberliteErrorStatus);
        }
      } else {
        try {
          const statement = Parser.parseSqlStatement(`${command}`);
          const res = await this.db.vm.execute(statement, this.db.activeTable);
          if (res) this.db.activeTable = res;
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
