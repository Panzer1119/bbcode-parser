import { BBCodeParser } from "../index";

test("Test BBCodeParser", () => {
    expect(new BBCodeParser(BBCodeParser.defaultTags()).parseString("[h1] Heading [/h1]")).toBe("<h1> Heading </h1>");
});
