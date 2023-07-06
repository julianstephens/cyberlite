import fs from "fs";
import readline from "node-color-readline";
import { Cyberlite as CB } from "./cyberlite";

export type EnumExtract<T> = T[keyof T];

type GrowToSize<T, N extends number, A extends T[]> = A["length"] extends N
  ? A
  : GrowToSize<T, N, [...A, T]>;

export type FixedArray<T, N extends number> = GrowToSize<T, N, []>;

export type Row = {
  id: string;
  username: string;
  email: string;
};

export type Pages = FixedArray<Buffer | null, 100>;

export type Pager = {
  fileDescriptor: number;
  fileLength: number;
  rs: fs.ReadStream;
  ws: fs.WriteStream;
  pages: Pages;
};

export type Table = {
  rowsPerPage: number;
  maxRows: number;
  numRows: number;
  pager: Pager;
};

export type SqlStatement = {
  method: CB.SqlStatementMethod;
  command?: string;
  data?: Row;
};

export type InsertStatement = Required<SqlStatement>;

export type Readline = typeof readline;

export type ErrorOptions = {
  message?: string;
  prop?: string;
  propType?: string;
};
