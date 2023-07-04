import chalk from "chalk";
import type { ErrorOptions } from "./types";
import { Cyberlite } from "./types/cyberlite";
import { HELP_MSG, WELCOME_MSG } from "./utils";

class Logger {
  #errorProp = (
    errorType: Cyberlite.Error.PropError,
    propType: string,
    prop: string,
  ) => {
    console.log(`${errorType} ${chalk.blue(propType)} '${chalk.red(prop)}'`);
  };

  #handleError = (error: string, message: string) => {
    console.log(`${chalk.red(error + ":")} ${message}`);
  };

  help = () => {
    console.log(HELP_MSG);
  };

  log = (message: string | string[]) => {
    console.log(`${Array.isArray(message) ? message.join(", ") : message}`);
  };

  welcome = () => {
    console.log(WELCOME_MSG);
  };

  error = (error: Cyberlite.Error.CyberliteError, options?: ErrorOptions) => {
    let type: string, msg: string;

    switch (error) {
      case Cyberlite.Error.Execution.MISSING_PROP:
        this.#errorProp(
          "Missing",
          "param",
          options.prop ?? Cyberlite.Error.Execution.MISSING_PROP,
        );
        break;
      case Cyberlite.Error.Execution.UNKNOWN_COMMAND:
        this.#errorProp(
          "Unrecognized",
          options.propType || "param",
          options.prop,
        );
        break;
      default:
        [type, msg] = error.split(":");
        this.#handleError(type, options.message ?? msg);
        break;
    }
  };
}

const logger = new Logger();
export default logger;
