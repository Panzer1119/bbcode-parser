//The type of a token
import { BBTag } from "./bbtag";

export enum TokenType {
    Text,
    StartTag,
    EndTag,
}

//Represents a token
export class Token {
    constructor(
        public tokenType: TokenType,
        public content: string,
        public tagAttributes?: { [key: string]: string },
        public tagStr?: string
    ) {}

    //String representation of the token
    toString(): string {
        return this.content + " (" + TokenType[this.tokenType] + ")";
    }

    //Check for equality
    equals(token: Token): boolean {
        return this.tokenType == token.tokenType && this.content == token.content;
    }
}

//Creates a new text token
export function textToken(content: string): Token {
    return new Token(TokenType.Text, content);
}

const attributeNameChars = "[a-zA-Z0-9\\.\\-_:;/]";
const attributeValueChars = "[a-zA-Z0-9\\.\\-_:;#/\\s]";

const tokenPattern = `\\[(\\/\\w*)\\]|\\[(\\w*)+(?:=(${attributeValueChars}*))?(?: (${attributeNameChars}+)=(${attributeValueChars}+))*\\]|\\[\\*\\] ?(['\\.,\\-:;#/\\w\\s]+)`;

//Creates a new tag token
export function tagToken(match: RegExpExecArray): Token {
    if (match[1] == undefined) {
        //Start tag
        const tagName: string = match[2];
        const attributes: { [key: string]: string } = {};
        const attributePattern = new RegExp("(" + attributeNameChars + "+)?=(" + attributeValueChars + "+)", "g");
        const attributeStr = match[0].substr(1 + tagName.length, match[0].length - 2 - tagName.length);
        let attributeMatch;
        while ((attributeMatch = attributePattern.exec(attributeStr))) {
            const value: string = attributeMatch[2]?.trim();
            if (attributeMatch[1] == undefined) {
                //The tag attribute
                attributes[tagName] = value;
            } else {
                //Normal attribute
                attributes[attributeMatch[1]] = value;
            }
        }
        return new Token(TokenType.StartTag, tagName, attributes, match[0]);
    } else {
        //End tag
        return new Token(TokenType.EndTag, match[1].substr(1, match[1].length - 1));
    }
}

//Converts the given token to a text token
export function asTextToken(token: Token): void {
    if (token.tokenType == TokenType.StartTag) {
        token.content = token.tagStr ?? "";
        token.tokenType = TokenType.Text;
        //delete token.attributes;
        //delete token.tagStr;
    }
    if (token.tokenType == TokenType.EndTag) {
        token.content = "[/" + token.content + "]";
        token.tokenType = TokenType.Text;
    }
}

//Represents a tokenizer
export class Tokenizer {
    //Creates a new tokenizer with the given tags
    constructor(private bbTags: { [key: string]: BBTag }) {}

    //Tokenizes the given string
    tokenizeString(str: string): Token[] {
        const tokens: Token[] = this.getTokens(str);
        const newTokens: Token[] = [];
        let noNesting = false;
        let noNestingTag = "";
        let noNestedTagContent = "";
        for (const i in tokens) {
            const currentToken = tokens[i];
            const bbTag: BBTag = this.bbTags[currentToken.content];
            let addTag = true;
            //Replace invalid tags with text
            if (bbTag === undefined && !noNesting) {
                asTextToken(currentToken);
            } else {
                //Check if current tag doesn't support nesting
                if (noNesting) {
                    if (currentToken.tokenType == TokenType.EndTag && currentToken.content == noNestingTag) {
                        noNesting = false;
                        newTokens.push(textToken(noNestedTagContent));
                    } else {
                        asTextToken(currentToken);
                        noNestedTagContent += currentToken.content;
                        addTag = false;
                    }
                } else {
                    if (bbTag.noNesting && currentToken.tokenType == TokenType.StartTag) {
                        noNesting = true;
                        noNestingTag = currentToken.content;
                        noNestedTagContent = "";
                    }
                }
            }
            if (addTag) {
                newTokens.push(currentToken);
            }
        }
        return newTokens;
    }

    //Gets the tokens from the given string
    getTokens(str: string): Token[] {
        const tagPattern = new RegExp(tokenPattern, "g");
        const tokens: Token[] = [];
        let match;
        let lastIndex = 0;
        while ((match = tagPattern.exec(str))) {
            const deltaInner = match.index - lastIndex;
            if (deltaInner > 0) {
                tokens.push(textToken(str.substr(lastIndex, deltaInner)));
            }
            if (match[6]) {
                //Is [*] List Item
                const tokenStart = new Token(TokenType.StartTag, "*", {}, "[*]");
                const tokenText = textToken(match[6]);
                const tokenEnd = new Token(TokenType.EndTag, "*");
                tokens.push(tokenStart);
                tokens.push(tokenText);
                tokens.push(tokenEnd);
            } else {
                const token = tagToken(match);
                tokens.push(token);
            }
            lastIndex = tagPattern.lastIndex;
        }
        const delta = str.length - lastIndex;
        if (delta > 0) {
            tokens.push(textToken(str.substr(lastIndex, delta)));
        }
        return tokens;
    }
}
