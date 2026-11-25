import { expect, test } from "vitest";
import { APP_NAME } from "./constants";

test("APP_NAME è definito", () => {
  expect(APP_NAME.length).toBeGreaterThan(0);
});
