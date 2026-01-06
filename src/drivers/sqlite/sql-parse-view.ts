import { tokenizeSql } from "@outerbase/sdk-transform";
import { DatabaseViewSchema } from "../base-driver";
import { CursorV2 } from "./sql-parse-table";

export function parseCreateViewScript(
  schemaName: string,
  sql: string
): DatabaseViewSchema {
  const cursor = new CursorV2(tokenizeSql(sql, "sqlite"));

  cursor.expectToken("CREATE");
  cursor.expectTokenOptional("TEMP");
  cursor.expectTokenOptional("TEMPORARY");
  cursor.expectToken("VIEW");
  cursor.expectTokensOptional(["IF", "NOT", "EXIST"]);

  const name = cursor.consumeIdentifier();

  cursor.expectToken("AS");

  let statement = "";
  const fromStatement = cursor.getPointer();
  let toStatement = fromStatement;

  while (!cursor.end()) {
    if (cursor.match(";")) {
      break;
    }

    toStatement = cursor.getPointer();
    cursor.next();
  }

  if (fromStatement !== undefined && toStatement !== undefined) {
    // toStatement points to the last non-semicolon token
    // Use toStatement + 1 because toStringRange uses exclusive end index
    statement = cursor.toStringRange(fromStatement, toStatement + 1);
  }

  return {
    schemaName,
    name,
    statement,
  };
}
