import readline from "node-color-readline";
import Database from "./database";
import env from "./env";
import logger from "./logger";
import Parser from "./parser";
import type { Readline } from "./types";
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
    this.db.open(path).catch((err) => {
      console.error(err);
      logger.error("CYBERLITE_INTERNAL", {
        message: "Could not initialize database",
      });
      throw new Error("Could not initialize database");
    });
  }

  /** Starts REPL session */
  start() {
    logger.welcome();
    this.run();
  }

  /** Closes db connection and quits repl */
  async stop() {
    try {
      await this.db.close();
    } catch (err) {
      console.error(err);
    }
    logger.log("Goodbye!");
    if (env.NODE_ENV === "test") {
      return this.rl.close();
    }
  }

  /** Loops REPL session until terminated by user */
  async run() {
    for await (const command of this.repl()) {
      if (/^\.exit/.test(`${command}`)) {
        await this.stop();
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
  }

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
}
