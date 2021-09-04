//Indicates if the first string ends with the second str
import { BBTag } from "./bbtag";
import { BBCodeParseTree, TreeType } from "./bbcodeparsetree";

export function endsWith(str: string, endStr: string): boolean {
    if (str.length === 0) {
        return false;
    }
    if (endStr.length > str.length) {
        return false;
    }
    const inStrEnd = str.substr(str.length - endStr.length, endStr.length);
    return endStr === inStrEnd;
}

//Indicates if the first string starts with the second string
export function startsWith(str: string, startStr: string): boolean {
    if (str.length === 0) {
        return false;
    }
    if (startStr.length > str.length) {
        return false;
    }
    const inStrStart = str.substr(0, startStr.length);
    return startStr === inStrStart;
}

export const tagsToReplace: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
};

//Escapes the given html
export function escapeHTML(html: string): string {
    return html.replace(/[&<>]/g, function (tag) {
        return tagsToReplace[tag] || tag;
    });
}

export class BBCodeParser {
    constructor(private bbTags: { [key: string]: BBTag }, private options = { escapeHTML: false }) {}

    //Parses the given string
    public parseString(content: string, stripTags = false, insertLineBreak = true, escapingHtml = true): string {
        //Create the parse tree
        const parseTree = BBCodeParseTree.buildTree(content, this.bbTags);
        //If the tree is invalid, return the input as text
        if (!parseTree || !parseTree.isValid()) {
            return content;
        }
        //Convert it to HTML
        return this.treeToHtml(parseTree.subTrees, insertLineBreak, escapingHtml, stripTags);
    }

    //Converts the given subtrees into html
    private treeToHtml(
        subTrees: Array<BBCodeParseTree>,
        insertLineBreak: boolean,
        escapingHtml: boolean,
        stripTags = false
    ): string {
        let htmlString = "";
        let suppressLineBreak = false;
        subTrees.forEach(currentTree => {
            if (currentTree.treeType === TreeType.Text) {
                let textContent = currentTree.content;
                if (escapingHtml) {
                    textContent = this.options.escapeHTML ? escapeHTML(textContent) : textContent;
                }
                if (insertLineBreak && !suppressLineBreak) {
                    textContent = textContent.replace(/(\r\n|\n|\r)/gm, "<br>");
                    suppressLineBreak = false;
                }
                htmlString += textContent;
            } else {
                //Get the tag
                const bbTag = this.bbTags[currentTree.content];
                const content = this.treeToHtml(currentTree.subTrees, bbTag.insertLineBreaks, escapingHtml, stripTags);
                //Check if to strip the tags
                if (!stripTags) {
                    htmlString += bbTag.markupGenerator(bbTag, content, currentTree.attributes);
                } else {
                    htmlString += content;
                }
                suppressLineBreak = bbTag.suppressLineBreaks;
            }
        });
        return htmlString;
    }

    //Returns the default tags
    public static defaultTags(): { [key: string]: BBTag } {
        const bbTags: { [key: string]: BBTag } = {};
        //Simple tags
        bbTags["b"] = new BBTag("b", true, false, false);
        bbTags["i"] = new BBTag("i", true, false, false);
        bbTags["u"] = new BBTag("u", true, false, false);

        bbTags["h1"] = BBTag.createSimpleTag("h1");
        bbTags["h2"] = BBTag.createSimpleTag("h2");
        bbTags["h3"] = BBTag.createSimpleTag("h3");
        bbTags["h4"] = BBTag.createSimpleTag("h4");
        bbTags["h5"] = BBTag.createSimpleTag("h5");
        bbTags["hr"] = BBTag.createSimpleTag("hr");

        bbTags["table"] = BBTag.createSimpleTag("table");
        bbTags["tr"] = BBTag.createSimpleTag("tr");
        bbTags["th"] = BBTag.createSimpleTag("th");
        bbTags["td"] = BBTag.createSimpleTag("td");

        bbTags["spoiler"] = BBTag.createSimpleTag("spoiler");

        bbTags["noparse"] = new BBTag("noparse", true, false, true);

        bbTags["strike"] = BBTag.createSimpleHTMLTag("strike", "s");

        bbTags["list"] = BBTag.createSimpleHTMLTag("olist", "ul");
        bbTags["olist"] = BBTag.createSimpleHTMLTag("olist", "ol");
        bbTags["*"] = BBTag.createSimpleHTMLTag("*", "li");

        bbTags["text"] = new BBTag("text", true, false, true, (tag, content) => content);

        bbTags["img"] = new BBTag(
            "img",
            true,
            false,
            false,
            (tag, content) => `<img src="${content}" alt="${content}"/>`
        );

        bbTags["quote"] = new BBTag("quote", true, false, false, (tag, content, attributes) => {
            const address = attributes["quote"] ? `<address>${attributes["quote"]}</address>` : "";
            return `<blockquote>${address}${content}</blockquote>`;
        });

        bbTags["url"] = new BBTag("url", true, false, false, (tag, content, attributes) => {
            let link = content;

            if (attributes["url"]) {
                link = escapeHTML(attributes["url"]);
            }

            if (!startsWith(link, "http://") && !startsWith(link, "https://")) {
                link = "http://" + link;
            }

            return '<a href="' + link + '" target="_blank">' + content + "</a>";
        });

        bbTags["code"] = new BBTag("code", true, false, true, (tag, content, attributes) => {
            const lang = attributes["lang"];

            if (lang) {
                return '<code class="' + escapeHTML(lang) + '">' + content + "</code>";
            } else {
                return "<code>" + content + "</code>";
            }
        });
        return bbTags;
    }

    public static escapeHTML(content: string): string {
        return escapeHTML(content);
    }

    public static startsWith(str: string, startStr: string): boolean {
        return startsWith(str, startStr);
    }

    public static endsWith(str: string, endStr: string): boolean {
        return endsWith(str, endStr);
    }
}
