import type { ImageNode } from "../nodes/types";

interface IImageElement {
    node: ImageNode;
}

const ImageElement = ({node}: IImageElement) => {
    const isDeleted = node.tags?.includes("diff-del");
    const isAdded = node.tags?.includes("diff-add");

    return (
        <div data-node-id={node.id}
             data-node-type={node.type}
             contentEditable={false}
             className="relative w-full my-1 group"
        >
            <img src={node.src} width={node.width} height={node.height} alt={node.alt || ""} className={`max-w-full ${isAdded ? "border border-green" : ""}`} style={{opacity: isDeleted ? 0.5 : 1}} />
            <button
                type="button"
                data-action="delete-image"
                onMouseDown={(e) => e.preventDefault()}
                aria-label="Remove image"
                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 cursor-pointer"
            >
                &times;
            </button>
        </div>
    )
}

export default ImageElement;
