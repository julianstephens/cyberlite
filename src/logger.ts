import chalk from "chalk";
import type { ErrorOptions } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { HELP_MSG, WELCOME_MSG } from "./utils";

/**
 * Wrapper around console.log for pretty-formatted CLI output
 */
class Logger {
  #errorProp(errorType: CB.Error.PropError, propType: string, prop?: string) {
    console.log(
      `${errorType} ${chalk.blue(propType)} '${prop && chalk.red(prop)}'`,
    );
  }

  #handleError(error: string, message: string, useDefault = false) {
    if (useDefault) {
      const split = message.split(":");
      console.log(`${chalk.red(split[0].trim() + ": ")}${split[1].trim()}`);
    } else {
      console.log(`${chalk.red(error + ": ")}${message}`);
    }
  }

  /** Prints help message with available commands */
  help() {
    console.log(HELP_MSG);
  }

  /**
   * Prints statement
   * @param message text to log or string array of row items
   */
  log(message: string | string[]) {
    console.log(`${Array.isArray(message) ? message.join(", ") : message}`);
  }

  /** Prints welcome message */
  welcome() {
    console.log(WELCOME_MSG);
  }

  /**
   * Prints error statement
   * @param error status message
   * @param options target specific property
   */
  error(error: CB.CyberliteErrorStatus, options?: ErrorOptions) {
    switch (error) {
      case "MISSING_PROP":
        this.#errorProp("Missing", "param", options?.prop);
        break;
      case "UNKNOWN_COMMAND":
        this.#errorProp(
          "Unrecognized",
          options?.propType || "keyword",
          options?.prop,
        );
        break;
      default:
        this.#handleError(
          error,
          options?.message || CB.CyberliteError[error],
          options?.useDefault,
        );
        break;
    }
  }
}

const logger = new Logger();
export default logger;
