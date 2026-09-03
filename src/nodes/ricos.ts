
import type { RicosDocument, RicosNode } from "../types/Ricos";
import { createImageNode, createListItemNode, createOrderedListNode, createTextNode, createUnorderedListNode } from "./factories";
import type { RosetteNode } from "./types";

export const convertFromRicosDocument = (doc: RicosDocument): RosetteNode[] => {
    var nodes: RosetteNode[] = [];

    for (const wixNode of doc.nodes) {
        const childNodes = convertFromRicosNode(wixNode);
        nodes.push(...childNodes);
    }

    return nodes.flat();
}

const convertFromRicosNode = (wixNode: RicosNode): RosetteNode[] => {
    var nodes: RosetteNode[] = [];

    var childTextList: string[] = []; // used for any wix nodes that we "skip"
    switch (wixNode.type) {
        case "PARAGRAPH":
            foreachRicosNodeChild(wixNode, (childNode: RicosNode) => {
                if (childNode.textData) childTextList.push(childNode.textData.text);
            });

            nodes.push(createTextNode(childTextList.join(" ")));
            return nodes; // escape, no need to search the children again;
        
        case "TEXT": 
            if (wixNode.textData) nodes.push(createTextNode(wixNode.textData.text));
            break;

        
        case "COLLAPSIBLE_ITEM_BODY":
        case "COLLAPSIBLE_ITEM_TITLE":
            foreachRicosNodeChild(wixNode, (wixChildNode: RicosNode) => {
                const childNode = convertFromRicosNode(wixChildNode);
                nodes.push(...childNode);
            });
            return nodes; // escape, no need to search the children again;
        
        
        case "COLLAPSIBLE_LIST":
        case "BULLETED_LIST":
            let unorderedListNode = createUnorderedListNode();
            unorderedListNode.nodes = [];
            nodes.push(unorderedListNode);
            break;

        case "ORDERED_LIST":
            let orderedListNode = createOrderedListNode();
            orderedListNode.nodes = [];
            nodes.push(orderedListNode);
            break;

        
        case "LIST_ITEM":
        case "COLLAPSIBLE_ITEM":
            const listItemNode = createListItemNode();
            listItemNode.nodes = [];
            nodes.push(listItemNode);
            break;
        
        case "IMAGE": {
            const image = wixNode.imageData!.image;
            const imageNode = createImageNode(`https://static.wixstatic.com/media/${image.src.id}`, {
                width: image.width,
                height: image.height,
                alt: image.altText,
            });

            nodes.push(imageNode);
            break;
        }

        case "FILE":
            let fileName: string = wixNode.fileData!.name;
            const fileNode = createTextNode(`[File: ${fileName}]`);
            nodes.push(fileNode);
            break;

        default:
            foreachRicosNodeChild(wixNode, (childNode: RicosNode) => {
                if (childNode.textData) childTextList.push(childNode.textData.text);
            });

            const textNode = createTextNode(childTextList.join(" "));
            nodes.push(textNode);
            return nodes; // escape, no need to search the children again;
    }

    if (nodes.length === 0) return nodes

    foreachRicosNodeChild(wixNode, (wixNodeChild: RicosNode) => {
        const nodeChild = convertFromRicosNode(wixNodeChild);
        if (!nodeChild) return;

        nodes[nodes.length - 1].nodes?.push(...nodeChild);
    })

    return nodes;
}


const foreachRicosNodeChild = (wixNode: RicosNode, callback: (wixNodeChild: RicosNode) => void) => {
    if (wixNode.nodes.length > 0) {
        for (const wixNodeChild of wixNode.nodes) {
            callback(wixNodeChild);
        }
    }
}

