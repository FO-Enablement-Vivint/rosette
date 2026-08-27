import type { ReactNode } from "react";

export interface IToolbarButton {
    buttonIcon: ReactNode;
    onClick?: () => void;
}

const ToolbarButton = ({buttonIcon, onClick}: IToolbarButton) => {
    const clickHandler = () => {
        onClick?.();
    }

    return (
        <button onMouseDown={(e) => e.preventDefault()} onClick={clickHandler} className="cursor-pointer hover:bg-green/20 px-3 py-1.5 border-1 border-transparent hover:border-green">{buttonIcon}</button>
    )
}

export default ToolbarButton;