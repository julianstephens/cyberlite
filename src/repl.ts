import readline from "node-color-readline";
import Database from "./database";
import logger from "./logger";
import Parser from "./parser";
import { Readline } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { COMPLETIONS, colorize, propertyOf } from "./utils";

/** Interactive REPL for Cyberlite */
export default class CyberliteRepl {
  readonly rl: Readline;
  readonly db: Database;
  readonly #prompt = "\n> ";

  constructor(path = "/home/julian/workspace/cyberlite/db") {
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
    this.db.open(path);
  }

  /** Loops REPL session until terminated by user */
  run = async () => {
    for await (const command of this.repl()) {
      // got .exit, commiting and terminating
      if (/^\.exit/.test(`${command}`)) {
        try {
          await this.db.close();
        } catch (err) {
          console.error(err);
        }
        logger.log("Goodbye!");
        break;
      }

      if (/^\./.test(`${command}`)) {
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
          logger.error(err.name, {
            ...(err.name ===
            propertyOf(CB.CyberliteError, (x) => x.UNKNOWN_COMMAND)
              ? { prop: err.message }
              : { message: err.message }),
          });
        }
      }
    }
  };

  *repl() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      colorize,
      completer: (line: string) => {
        const hits = COMPLETIONS.filter((c) => c.startsWith(line));
        return [hits.length ? hits : COMPLETIONS, line];
      },
    });

    try {
      for (;;) {
        yield new Promise<string>((resolve) =>
          rl.question(this.#prompt, resolve),
        );
      }
    } finally {
      rl.close();
    }
  }

  /** Starts REPL session */
  start = () => {
    logger.welcome();
    this.run();
  };
}
