import stdin from "mock-stdin";
import { repl } from "@/repl";
import { HELP_MSG, createReadLine, rl } from "@/utils";
import { log } from "console";
import { Table } from "@/types";
import { createTable } from "@/executor";
import chalk from "chalk";

describe("database", () => {
  let mockStdin: ReturnType<typeof stdin.stdin>;
  let mockConsole: jest.SpyInstance;
  let mockExit: jest.SpyInstance;
  let table: Table;

  beforeEach(() => {
    table = createTable();
    mockStdin = stdin.stdin();
    mockConsole = jest.spyOn(console, "log");
    mockExit = jest
      .spyOn(process, "exit")
      .mockImplementation((_code?: number) => undefined as never);
  });

  afterEach(async () => {
    await rl.close();
    mockConsole.mockClear();
    mockStdin.restore();
    table = null;
  });

  const runner = async (commands: string[]) => {
    const rl = createReadLine();
    repl("> ", rl, table);
    commands.forEach((c) => {
      mockStdin.send(`${c}\r`);
    });
    mockStdin.send(".exit\r");
    mockStdin.end();
    await rl.close();
  };

  it("prints help message", async () => {
    await runner([".help"]);

    expect(mockConsole.mock.calls[0][0]).toEqual(`${HELP_MSG}`);
    expect(mockExit).toHaveBeenCalled();
  });

  it("inserts and retrieves a new row", async () => {
    await runner(["insert 1 user1 user1@test.com", "select"]);
    expect(mockConsole.mock.calls[0][0].trim().replace("\n", "")).toMatch(
      /Executed \(\d+.\d{2}ms\)/gm,
    );
    expect(mockConsole.mock.calls[1][0]).toEqual("(1, user1, user1@test.com)");
    expect(mockConsole.mock.calls[2][0].trim().replace("\n", "")).toMatch(
      /Executed \(\d+.\d{2}ms\)/gm,
    );
    expect(mockExit).toHaveBeenCalled();
  });

  //FIXME: table numRows not updating during testing
  // it("prints error message when table is full", async () => {
  //   const rows = Array(10)
  //     .fill(null)
  //     .map((_, i) => `insert ${i} user${i} user${i}@test.com`);
  //   log(rows.length);
  //   // log(rows[200]);
  //   await runner(rows);
  //   // log(mockConsole.mock.calls);
  //   const maxRows = ~~(PAGE_SIZE / MAX_ROW_SIZE) * TABLE_MAX_PAGES;
  //   log(mockConsole.mock.calls[0][0]);
  //   expect(mockConsole.mock.calls[0][maxRows]).toEqual("Error: Table full");
  //   expect(mockExit).toHaveBeenCalled();
  // });

  it("allows inserting strings that are max length", async () => {
    await runner([
      `insert 3223 ${"a".repeat(35)} ${"a".repeat(255)}`,
      "select",
    ]);
    log(mockConsole.mock.calls[0][0]);
    expect(mockConsole.mock.calls[0][0].trim().replace("\n", "")).toMatch(
      /Executed \(\d+.\d{2}ms\)/gm,
    );
    expect(mockConsole.mock.calls[1][0]).toEqual(
      `(3223, ${"a".repeat(35)}, ${"a".repeat(255)})`,
    );
    expect(mockExit).toHaveBeenCalled();
  });

  it("prints error if strings are longer than max length", async () => {
    await runner([
      `insert 3223 ${"a".repeat(36)} user@test.com`,
      `insert 3223 user ${"a".repeat(256)}`,
    ]);
    expect(
      encodeURIComponent(mockConsole.mock.calls[0][0].trim().replace("\n", "")),
    ).toEqual(
      encodeURIComponent(
        `${chalk.red("Syntax Error:")} '${chalk.red(
          "username",
        )}' must not be longer than '${chalk.yellow("35")}' characters`,
      ),
    );
    expect(
      encodeURIComponent(mockConsole.mock.calls[1][0].trim().replace("\n", "")),
    ).toEqual(
      encodeURIComponent(
        `${chalk.red("Syntax Error:")} '${chalk.red(
          "email",
        )}' must not be longer than '${chalk.yellow("255")}' characters`,
      ),
    );
    expect(mockExit).toHaveBeenCalled();
  });

  it("prints error if id is negative", async () => {
    await runner([`insert -1 user user@test.com`]);
    expect(
      encodeURIComponent(mockConsole.mock.calls[0][0].trim().replace("\n", "")),
    ).toEqual(
      encodeURIComponent(
        `${chalk.red("Syntax Error:")} '${chalk.red("id")}' must be positive`,
      ),
    );
    expect(mockExit).toHaveBeenCalled();
  });
});
