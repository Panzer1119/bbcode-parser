import { BBTag } from "./bbtag";
import { Token, Tokenizer, TokenType } from "./tokenizer";

export enum TreeType {
    Root,
    Text,
    Tag,
}

export class BBCodeParseTree {
    constructor(
        public treeType: TreeType,
        public content: string,
        public attributes: { [key: string]: string } = {},
        public subTrees: BBCodeParseTree[] = []
    ) {}

    //Indicates if the current tree is valid
    isValid(): boolean {
        //An tree without subtrees is valid
        if (this.subTrees.length === 0) {
            return true;
        }
        //An tree is valid if all of its subtrees are valid
        for (const i in this.subTrees) {
            const currentTree = this.subTrees[i];
            if (!currentTree || !currentTree.isValid()) {
                return false;
            }
        }
        return true;
    }

    //String representation of the tree
    toString(): string {
        return TreeType[this.treeType] + " - " + this.content;
    }

    //Builds a parse tree from the given string
    public static buildTree(str: string, bbTags: { [key: string]: BBTag }): BBCodeParseTree | null {
        //Get the tokens
        const tokenizer = new Tokenizer(bbTags);
        const tokens = tokenizer.tokenizeString(str);
        //Build the tree
        tokens.reverse();
        return BBCodeParseTree.buildTreeFromTokens(new BBCodeParseTree(TreeType.Root, str), tokens);
    }

    //Builds a tree from the given tokens
    private static buildTreeFromTokens(
        rootTree: BBCodeParseTree,
        tokens: Token[],
        currentTag = ""
    ): BBCodeParseTree | null {
        //The root root is invalid, return null
        if (!rootTree) {
            return null;
        }
        //There are no more tokens, return the root
        if (tokens.length === 0) {
            return rootTree;
        }
        //Remove the first token
        const currentToken: Token | undefined = tokens.pop();
        if (!currentToken) {
            return rootTree;
        }
        //Add the text token as a text parse tree
        if (currentToken.tokenType === TokenType.Text) {
            rootTree.subTrees.push(new BBCodeParseTree(TreeType.Text, currentToken.content));
        }
        //Create a new tag tree and find its subtrees
        if (currentToken.tokenType === TokenType.StartTag) {
            const tagName = currentToken.content;
            const treeFromTokens = BBCodeParseTree.buildTreeFromTokens(
                new BBCodeParseTree(TreeType.Tag, tagName, currentToken.tagAttributes),
                tokens,
                tagName
            );
            if (treeFromTokens) {
                rootTree.subTrees.push(treeFromTokens);
            }
        }
        //Check if its the correct end tag
        if (currentToken.tokenType === TokenType.EndTag) {
            if (currentToken.content === currentTag) {
                return rootTree;
            } else {
                return null;
            }
        }
        //If we got no more tokens, and we have opened an tag but not closed it, return null
        if (tokens.length === 0) {
            if (currentTag !== "") {
                return null;
            }
        }
        //Proceed to the next token
        return BBCodeParseTree.buildTreeFromTokens(rootTree, tokens, currentTag);
    }
}
