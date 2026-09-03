
export interface RicosDocument {
    documentStyle: {};
    nodes: RicosNode[];
}


export interface RicosNode {
    id: string;
    nodes: RicosNode[];
    type: string;
    style?: {};
    textData?: {
        decorations: any[],
        text: string;
    };
    collapsibleListData?: any;
    fileData?: {
        name: string;
        size: number;
        sizeInKb: string;
        src: {
            id: string;
            private: boolean;
        }
        type: string;
    };
    imageData?: {
        containerData?: {
            alignment?: string;
            textWrap?: boolean;
            width?: { size?: string };
        },
        image: {
            src: {
                id: string;
            };
            width?: number;
            height?: number;
            altText?: string;
        }
    }
}