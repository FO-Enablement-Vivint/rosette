export interface ImageUploadResult {
    src: string;
    width?: number;
    height?: number;
    alt?: string;
}

export type ImageUploadHandler = (file: File) => Promise<ImageUploadResult>;

/** Default max upload size (in bytes) for images inserted via the toolbar, unless overridden via EditorConfig.maxFileSize. */
export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 10;

/**
 * Default fallback used when no onImageUpload handler is provided. Reads the
 * file into a base64 data URL and measures its natural dimensions.
 */
export const readImageAsDataUrl = (file: File): Promise<ImageUploadResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const src = reader.result as string;
            const img = new Image();
            img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ src });
            img.src = src;
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}
