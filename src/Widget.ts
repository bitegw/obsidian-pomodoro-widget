import { App, setIcon } from "obsidian";
import { createBlankImage } from "./util";

export enum Corner {
	TopLeft = 'Top left',
	TopRight = 'Top right',
	BottomLeft = 'Bottom left',
	BottomRight = 'Bottom right',
}

export default class Widget {
    public widgetElement: HTMLElement;
    public isVisible: boolean;

    static readonly ANIMATION_DURATION = 150;
    static readonly DRAG_LIMIT_LEFT = 50;
    static readonly DRAG_LIMIT_TOP = 46;
    static readonly DRAG_LIMIT_RIGHT = 20;
    static readonly DRAG_LIMIT_BOTTOM = 10;

    private anchor: Corner;
    private xOffset: number;
    private yOffset: number;

    private grabOffsets: {top: number, left :number, bottom: number, right: number};
    private screen: DOMRect;

    private onToggle?: (isVisible: boolean) => void;

    constructor(app: App, isVisible: boolean, options: { 
            onClose?: () => void, 
            onDrag?: (nearestCorner: Corner, xOffset: number, yOffset: number) => void,
            onToggle?: (isVisible: boolean) => void
        }) {
        this.onToggle = options.onToggle;
        this.widgetElement = createDiv();
        this.isVisible = isVisible;
        if(!isVisible) {
            this.hide();
        }
        this.widgetElement.addClass('pomo-widget');
        this.widgetElement.addClass('pomo-widget-show');

        const top = this.widgetElement.createDiv();
        top.addClass('pomo-widget-top');
        top.draggable = true;

        const blankImage = createBlankImage();
        top.appendChild(blankImage);

        const dragEvent = (e: DragEvent) => {
            this.screen = this.widgetElement.parentElement!.getBoundingClientRect();

            if(e.clientX <= 0 || e.clientY <= 0) {
                return; // Off-screen
            }

            const mouseX = Math.clamp(e.clientX, Widget.DRAG_LIMIT_LEFT + this.grabOffsets.left, this.screen.width - Widget.DRAG_LIMIT_RIGHT - this.grabOffsets.right);
            const mouseY = Math.clamp(e.clientY, Widget.DRAG_LIMIT_TOP + this.grabOffsets.top, this.screen.height - Widget.DRAG_LIMIT_BOTTOM - this.grabOffsets.bottom);

            const halfWidth = this.screen.width / 2;
            if(mouseY >= this.screen.height / 2) {      // Bottom
                if(mouseX >= halfWidth) {               // Right
                    this.anchor = Corner.BottomRight;
                } else {                                // Left
                    this.anchor = Corner.BottomLeft;
                }
            } else {                                    // Top
                if(mouseX >= halfWidth) {               // Right
                    this.anchor = Corner.TopRight;
                } else {                                // Left
                    this.anchor = Corner.TopLeft;
                }
            }

            switch(this.anchor) {
                case Corner.TopLeft:
                    this.xOffset = mouseX - this.grabOffsets.left;
                    this.yOffset = mouseY - this.grabOffsets.top;
                    break;
                case Corner.TopRight:
                    this.xOffset = this.screen.width - mouseX - this.grabOffsets.right;
                    this.yOffset = mouseY - this.grabOffsets.top;
                    break;
                case Corner.BottomLeft:
                    this.xOffset = mouseX - this.grabOffsets.left;
                    this.yOffset = this.screen.height - mouseY - this.grabOffsets.bottom;
                    break;
                case Corner.BottomRight:
                    this.xOffset = this.screen.width - mouseX - this.grabOffsets.right;
                    this.yOffset = this.screen.height - mouseY - this.grabOffsets.bottom;
                    break;
                default:
                    break;
            }

            this.updatePosition();
            
            if(options.onDrag)
                options.onDrag(this.anchor, this.xOffset, this.yOffset);
        };

        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        document.body.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        this.grabOffsets = { top: 0, left: 0, bottom: 0, right: 0 /*this.screen.height, right: this.screen.width*/};
        top.addEventListener('dragstart', (e: DragEvent) => {
            e.dataTransfer!.setDragImage(blankImage, 0, 0);
            e.dataTransfer!.effectAllowed = 'move';
            const rect = this.widgetElement.getBoundingClientRect();
            this.grabOffsets.top = e.clientY - rect.top;
            this.grabOffsets.left = e.clientX - rect.left;
            this.grabOffsets.bottom = rect.height - this.grabOffsets.top;
            this.grabOffsets.right= rect.width - this.grabOffsets.left;
        }, false);
        top.addEventListener('drag', dragEvent);
        top.addEventListener('dragend', dragEvent);

        const minimizeBtn = top.createEl('button');
        minimizeBtn.addClass('pomo-widget-top-button');
        setIcon(minimizeBtn, 'minus');
        minimizeBtn.addEventListener('click', () => {
            this.isVisible = true;
            this.toggle();
        });

        const closeBtn = top.createEl('button');
        closeBtn.addClass('pomo-widget-top-button');
        setIcon(closeBtn, 'x');
        closeBtn.addEventListener('click', (e) => {
            this.isVisible = true;
            this.toggle();
            if(options.onClose)
                options.onClose();
        });

        // Add widget to the workspace once it is fully loaded.
		// In the future maybe use openPopoutLeaf instead, 
		// if we need 'outside of current window' functionality
		app.workspace.onLayoutReady(() => {
			app.workspace.containerEl.appendChild(this.widgetElement);
		});
    }

    public updatePosition() {
        switch(this.anchor) {
            case Corner.TopLeft:
                this.updateOffsets(
                    `${this.yOffset}px`,
                    `${this.xOffset}px`,
                    'unset',
                    'unset',
                );
                break;
            case Corner.TopRight:
                this.updateOffsets(
                    `${this.yOffset}px`,
                    'unset',
                    'unset',
                    `${this.xOffset}px`,
                );
                break;
            case Corner.BottomLeft:
                this.updateOffsets(
                    'unset',
                    `${this.xOffset}px`,
                    `${this.yOffset}px`,
                    'unset',
                );
                break;
            case Corner.BottomRight:
                this.updateOffsets(
                    'unset',
                    'unset',
                    `${this.yOffset}px`,
                    `${this.xOffset}px`,
                );
                break;
            default:
                break;
        }
    }

    private updateOffsets(top: string, left: string, bottom: string, right: string) {
        this.widgetElement.style.top = top;
        this.widgetElement.style.left = left;
        this.widgetElement.style.bottom = bottom;
        this.widgetElement.style.right = right;
    }

    public hide() {
        this.widgetElement.removeClass('pomo-widget-show');
        // Update style next frame to trigger animation reload
        setTimeout(() => {
            this.widgetElement.addClass('pomo-widget-hide');
        }, 1);
        setTimeout(() => {
            this.widgetElement.addClass('pomo-hidden');
        }, Widget.ANIMATION_DURATION);
        this.isVisible = false;
    }

    public show() {
        this.widgetElement.removeClass('pomo-widget-hide');
        this.widgetElement.removeClass('pomo-hidden');
        setTimeout(() => {
            this.widgetElement.addClass('pomo-widget-show');
        }, 1);
        this.isVisible = true;
    }

    public toggle() {
        if(this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
        if(this.onToggle) {
            this.onToggle(this.isVisible);
        }
    }

    public updateSettings(options: {widgetVisible?: boolean, widgetAnchor?: Corner, widgetXOffset?: number, widgetYOffset?: number}) {
        if(options.widgetAnchor) 
            this.anchor = options.widgetAnchor;
        if(options.widgetXOffset && options.widgetYOffset) {
            this.xOffset = options.widgetXOffset;
            this.yOffset = options.widgetYOffset;
            this.updatePosition();
        }
        if(options.widgetVisible != null) {
            this.isVisible = !options.widgetVisible;
            this.toggle();
        }
    }
}