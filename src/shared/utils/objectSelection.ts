export type EditableObjectKind = 'sticker' | 'widget';

export const OBJECT_SELECTION_EVENT = 'eclipin:object-selection';
export const OBJECT_GROUP_DRAG_EVENT = 'eclipin:object-group-drag';

export interface ObjectSelectionEventDetail {
  kind: EditableObjectKind | null;
  id?: string;
  /** Keep selections owned by the other surface instead of replacing them. */
  additive?: boolean;
}

export interface ObjectGroupDragEventDetail {
  activeKind: EditableObjectKind;
  activeId: string;
  phase: 'preview' | 'commit' | 'cancel';
  /** Logical-canvas delta, not physical CSS pixels. */
  dx: number;
  dy: number;
}

export const announceObjectSelection = (
  kind: EditableObjectKind | null,
  id?: string,
  options?: { additive?: boolean },
) => {
  window.dispatchEvent(new CustomEvent<ObjectSelectionEventDetail>(OBJECT_SELECTION_EVENT, {
    detail: { kind, id, additive: options?.additive },
  }));
};

export const announceObjectGroupDrag = (detail: ObjectGroupDragEventDetail) => {
  window.dispatchEvent(new CustomEvent<ObjectGroupDragEventDetail>(OBJECT_GROUP_DRAG_EVENT, {
    detail,
  }));
};
