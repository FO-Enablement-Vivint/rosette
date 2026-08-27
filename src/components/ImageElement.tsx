import type { ImageNode } from "../nodes/types";
import { useEditor } from "../providers/editor/EditorProvider";
import { deleteNode } from "../nodes/commands";
import { getNodeBefore } from "../nodes/utils";

interface IImageElement {
    node: ImageNode;
}

const ImageElement = ({node}: IImageElement) => {
    const {nodes, replaceNodes, focusNode} = useEditor();

    const deleteHandler = () => {
        const nodeBefore = getNodeBefore(nodes, node.id);
        const updatedNodes = deleteNode(nodes, node.id);
        replaceNodes(updatedNodes);

        if (nodeBefore?.node) {
            const offset = "content" in nodeBefore.node ? nodeBefore.node.content.length : 0;
            focusNode(nodeBefore.node.id, offset);
        }
    }

    return (
        <div data-node-id={node.id}
             data-node-type={node.type}
             contentEditable={false}
             className="relative w-full my-1 group"
        >
            <img src={node.src} width={node.width} height={node.height} alt={node.alt || ""} className="max-w-full" />
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={deleteHandler}
                aria-label="Remove image"
                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 cursor-pointer"
            >
                &times;
            </button>
        </div>
    )
}

export default ImageElement;
