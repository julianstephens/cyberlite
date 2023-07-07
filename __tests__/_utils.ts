import fs from "fs";
import stripAnsi from "strip-ansi";
import Database from "../src/database";
import { SqlStatement } from "../src/types";

export const TEST_DB = "/home/julian/workspace/cyberlite/test_db";

export const clearDb = () => {
  fs.writeFileSync(TEST_DB, "");
}

export const seed = async (numPages = 1, write = true) => {
    const db = new Database(TEST_DB);
    await db.open();

    for (let i = 1; i <= (numPages * db.activeTable.maxRows); i++) {
      await db.vm.execute({ method: "insert", command: `${i} user${i} email${i}`, data: { id: `${i}`, username: `user${i}`, email: `email${i}`}}, db.activeTable)
    }

    const pages = db.activeTable.pager.pages;
    if (write) await db.close()

    return pages;
}

export const PAGE_TEXT = "1 user1 email12 user2 email23 user3 email3";

export const ROW = "1, user1, email1";

export const INSERT_STATEMENT: SqlStatement =  {
  method: "insert",
  command: " 1 user1 email1",
  data: {
    id: "1",
    username: "user1",
    email: "email1"
  }
}

export const SELECT_STATEMENT: SqlStatement =  {
  method: "select",
  command: "*",
}

export const cleanText = (text: string) => stripAnsi(text.replace(/\0/g, ""))
