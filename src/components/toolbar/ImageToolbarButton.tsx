import { useRef, type ChangeEvent } from "react";
import { createImageNode } from "../../nodes/factories";
import { DEFAULT_MAX_FILE_SIZE, readImageAsDataUrl, type ImageUploadHandler } from "../../nodes/imageUpload";
import ToolbarButton, { type IToolbarButton } from "./ToolbarButton";
import type { RosetteNode } from "../../nodes/types";

interface IImageToolbarButton extends Omit<IToolbarButton, "onClick"> {
    onImageUpload?: ImageUploadHandler;
    onImageUploadError?: (message: string) => void;
    onClick?: (node: RosetteNode) => void;
    maxFileSize?: number;
}

const ImageToolbarButton = ({buttonIcon, onImageUpload, onImageUploadError, onClick, maxFileSize = DEFAULT_MAX_FILE_SIZE}: IImageToolbarButton) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const changeHandler = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file later

        if (!file) return;

        if (file.size > maxFileSize) {
            const message = `Image "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, which exceeds the ${(maxFileSize / (1024 * 1024)).toFixed(0)}MB upload limit.`;
            if (onImageUploadError) onImageUploadError(message);
            else console.warn(message);
            return;
        }

        const result = await (onImageUpload ? onImageUpload(file) : readImageAsDataUrl(file));
        onClick?.(createImageNode(result.src, result));
    }

    return (
        <>
            <ToolbarButton buttonIcon={buttonIcon} onClick={() => inputRef.current?.click()} />
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={changeHandler} />
        </>
    )
}

export default ImageToolbarButton;
