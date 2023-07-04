import { EnumExtract } from ".";

export namespace Cyberlite {
  export namespace Error {
    export const System = {
      CYBERLITE_INTERNAL: "System Error: internal logic error",
      IOERR_OPEN: "IO Error: 'open' operation failed",
      IOERR_CLOSE: "IO Error: 'close' operation failed",
      IOERR_READ: "IO Error: 'read' operation failed",
      IOERR_WRITE: "IO Error: 'write' operation failed",
      OUT_OF_BOUNDS: "System Error: page number out of bounds",
    } as const;
    export type SystemError = EnumExtract<typeof System>;

    export const Execution = {
      TABLE_FULL:
        "Execution Error: 'insertion' operation failed because table full",
      INVALID_SYNTAX: "Syntax Error: invalid syntax",
      MISSING_PROP: "Syntax Error: missing property",
      UNKNOWN_COMMAND: "Sytax Error: unknown command",
    } as const;
    export type ExecutionError = EnumExtract<typeof Execution>;

    export type PropError = "Unrecognized" | "Missing";
  }

  export namespace Result {
    export const Execution = {
      OK: "Success",
      INSERTED: "'insert' operation successful",
      UPDATED: "'update' operation successful",
      DELETED: "'delete' operation successful",
    } as const;

    export type ExecutionStatus = EnumExtract<typeof Execution>;
  }

  export const CyberliteError = {
    ...Error.System,
    ...Error.Execution,
  } as const;

  export type CyberliteError = typeof CyberliteError;

  export type CyberliteErrorStatus = keyof typeof CyberliteError;

  export type CyberliteStatus =
    | CyberliteErrorStatus
    | keyof typeof Result.Execution;
}
