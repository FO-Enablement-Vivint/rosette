---
name: "image-node-and-upload"
created: "2026-08-26T22:51:43.084Z"
status: pending
---

## Context

Explored the full rosette rich-editor codebase (React 19, hand-rolled, no ProseMirror/Slate). Key files and current state:

- **src/nodes/types.ts** — `RosetteNode` is a discriminated union (`TEXT`, `LIST_ITEM`, `ORDERED_LIST`, `UNORDERED_LIST`). All nodes have `id`, `type`, `tags: string[]`, optional `nodes?`. Leaf nodes (like `TextNode`) omit `nodes`.
- **src/nodes/ricos.ts** — `convertFromRicosDocument` recursively converts Ricos JSON into `RosetteNode[]`. The `case "IMAGE":` branch currently discards all image data and creates a placeholder `TextNode` with content `[Image: <id>]`.
- **src/nodes/factories.tsx** — one factory function per node type (`createTextNode`, `createListItemNode`, etc.) plus generic `copyNode`/`copyNodes`.
- **src/nodes/renderNode.tsx** — a plain (non-exhaustive) switch dispatching to per-type components (`TextElement`, `ListItem`, `OrderedList`, `UnorderedList`). No compiler safety net for missed cases — must remember to add the `IMAGE` case.
- **src/nodes/commands.ts** — `insertToolbarNode`/`insertAtText` handle toolbar-driven insertion. Confirmed bug/gap: `insertAtText` only has a working branch when the inserted node has a `nodes` array (used to wrap the current text in a new list-item) or when the target text is already inside a `LIST_ITEM`. If the cursor is in a **top-level** text node and you insert a **leaf** node (no `nodes`, e.g. an image), none of the branches match and it silently no-ops. This must be fixed for image insertion to work at the top level, which is the common case.
- **Toolbar** — src/components/ToolbarButton.tsx is plain-text-label buttons (`"OL"`, `"UL"`), no icon library installed anywhere in `package.json`. The `node: () => RosetteNode` prop is synchronous — doesn't fit an async file-upload flow, so a new dedicated component is needed rather than reusing `ToolbarButton` as-is.
- **src/providers/editor/EditorProvider.tsx** — `focusNode`'s DOM range logic assumes a text-bearing child node. After inserting an image we should refocus a trailing/adjacent text node (same pattern `Editor.tsx`'s `toolbarHandler` already uses for OL/UL, which looks up a nested `TEXT` node — for images there is none, so we instead need a following text node to focus).
- **public/ricos-sample.json** / `src/tests/ricos-sample.ts` — real Ricos `IMAGE` node shape confirmed:
  ```json
  {
    "id": "0ks7s1031",
    "imageData": {
      "containerData": { "alignment": "LEFT", "textWrap": false, "width": { "size": "SMALL" } },
      "image": { "height": 1227, "width": 1227, "src": { "id": "97ce51_9b15b10fa6104fcbbc718a6fe2758c72~mv2.png" } }
    },
    "nodes": [], "type": "IMAGE"
  }
  ```
  `src.id` is a Wix Media Manager asset id, not a resolvable URL — per user decision, convert to `https://static.wixstatic.com/media/{id}` during parsing.
- **src/types/Ricos.ts** — currently out of sync with the sample data: `imageData.image` type is missing `width`/`height`, `containerData` typed as `{}`. Needs widening.
- No existing upload/file-picker/Wix-API code anywhere in `src/` — this is greenfield. No `dependencies` block in `package.json` at all (pure devDeps/peerDeps library).

## User decisions

- New node/button is for **images**, not video (user confirmed "video" was a slip).
- Ricos `IMAGE` parsing should resolve to a real `https://static.wixstatic.com/media/{id}` URL.
- Upload integration: Rosette exposes a **pluggable `onImageUpload` callback** — the host app owns Wix API credentials/calls and returns `{ src, width?, height? }`; Rosette never talks to Wix directly. Falls back to a base64 data URL via `FileReader` if no callback is supplied, so the package still works standalone.
- Toolbar button: **plain text label** for now (user is preparing custom SVGs to swap in later) — no icon library added.

## Implementation steps

1. **`src/nodes/types.ts`** — add `IMAGE: "image"` to `NODE_TYPES`; add

   ```ts
   export interface ImageNode extends RosetteNodeBase<typeof NODE_TYPES.IMAGE> {
       src: string;
       width?: number;
       height?: number;
       alt?: string;
   }
   ```

   (no `nodes` field — leaf node like `TextNode`); add `ImageNode` to the `RosetteNode` union.

2. **`src/nodes/factories.tsx`** — add

   ```ts
   export const createImageNode = (src: string, opts?: { width?: number; height?: number; alt?: string }): ImageNode => ({
       id: crypto.randomUUID(),
       type: NODE_TYPES.IMAGE,
       tags: [],
       src,
       width: opts?.width,
       height: opts?.height,
       alt: opts?.alt,
   })
   ```

3. **`src/types/Ricos.ts`** — widen:

   ```ts
   imageData?: {
       containerData?: { alignment?: string; textWrap?: boolean; width?: { size?: string } };
       image: { src: { id: string }; width?: number; height?: number; altText?: string };
   }
   ```

4. **`src/nodes/ricos.ts`** — replace the placeholder `case "IMAGE":` with:

   ```ts
   case "IMAGE": {
       const image = wixNode.imageData!.image;
       node = createImageNode(`https://static.wixstatic.com/media/${image.src.id}`, {
           width: image.width,
           height: image.height,
       });
       break;
   }
   ```

   Leave the existing fallthrough logic as-is (`if (!node.nodes) return node;` already correctly short-circuits for leaf nodes).

5. **New `src/components/ImageElement.tsx`** — mirrors `TextElement` structurally but renders an `<img>`:

   ```tsx
   const ImageElement = ({ node }: { node: ImageNode }) => (
       <img data-node-id={node.id} src={node.src} width={node.width} height={node.height} alt={node.alt ?? ""} />
   );
   ```

   Check `TextElement.tsx` first for exact conventions (contentEditable attrs, className, data attributes) to match styling/attribute conventions.

6. **`src/nodes/renderNode.tsx`** — add:

   ```tsx
   case NODE_TYPES.IMAGE:
       return (<ImageElement node={node} key={node.id} />)
   ```

7. **`src/nodes/commands.ts`** — fix `insertAtText`'s fallback branch. Currently ends in a silent no-op when the target text node is top-level and the inserted node has no `nodes`. Add a branch: when `!("nodes" in insertedNode)` (leaf node) and target is top-level, use `insertNodeAfter(nodes, target.node.id, insertedNode)` and also insert a fresh empty `TextNode` immediately after the image (so the user has somewhere to keep typing/click into) — return the updated array. Verify this doesn't regress the existing `LIST_ITEM`-parent branch (leaf insertion inside a list item should keep working as today).

8. **Editor/EditorProvider — `onImageUpload` prop and upload flow**:

   - Add `onImageUpload?: (file: File) => Promise<{ src: string; width?: number; height?: number; alt?: string }>` to `EditorProviderProps` (and thread through to wherever `Editor.tsx` needs it — likely passed straight through as a prop on `Editor`, not stored in context state, since it's just a callback used at upload time).
   - Add a fallback helper (e.g. in a new small `src/nodes/imageUpload.ts` or inline in the toolbar button component) that does:
     ```ts
     const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result as string);
         reader.onerror = reject;
         reader.readAsDataURL(file);
     });
     ```
   - Also capture natural width/height for the fallback path (load into an `Image()` to read `naturalWidth`/`naturalHeight` before resolving), so `ImageNode.width/height` gets populated even without a callback.

9. **New `src/components/ImageToolbarButton.tsx`**:

   - Renders a plain text-labeled button (e.g. `"IMG"`) matching `ToolbarButton`'s existing text-button style/classNames, plus a hidden `<input type="file" accept="image/*">` ref.
   - `onClick` triggers the hidden input's click (with the same `onMouseDown preventDefault` pattern as `ToolbarButton` to avoid stealing focus/selection).
   - `onChange` on the input: reads the selected `File`, calls `onImageUpload?.(file)` if provided else falls back to the base64 helper, builds `createImageNode(src, {width, height})`, then calls the same insertion path `Editor.tsx`'s `toolbarHandler` uses today (likely by accepting a `toolbarHandler`-like callback prop, or by exposing `toolbarHandler` itself for reuse) — must reset `input.value = ""` after handling so re-selecting the same file re-triggers `onChange`.

10. **`src/components/Editor/Editor.tsx`** — wire the new button into the toolbar row alongside OL/UL, pass `onImageUpload` prop down from `Editor`'s own props. Since insertion of a leaf node won't have an internal `TEXT` node to refocus into (per `toolbarHandler`'s `findNodeOfType(... NODE_TYPES.TEXT)` lookup), and step 7 already inserts a trailing empty text node after the image, update `toolbarHandler` (or the image-specific insertion path) to focus that trailing text node instead of relying on `findNodeOfType` finding one *inside* the inserted node.

11. **`src/index.ts`** — export `createImageNode` from factories and `ImageNode` type; also export the new `onImageUpload` prop type if it's defined as a named interface.

## Verification

- Run the package build (`npm run build` or equivalent Vite lib build) to confirm TypeScript compiles cleanly with the new discriminated union member (check for any exhaustiveness issues in switches that aren't literally the ones touched).

- Manually feed `public/ricos-sample.json` through `convertFromRicosDocument` (existing test fixture) and confirm the 6 `IMAGE` nodes produce `ImageNode`s with `src` starting with `https://static.wixstatic.com/media/` and correct `width`/`height` copied from the sample.

- Manual smoke test in the demo/dev app (whatever renders `<Editor>` today, e.g. `src/App.tsx` if present) — confirm:

  - Clicking the new toolbar button while cursor is in a top-level paragraph inserts an image and leaves a text node after it that receives focus (validates the `insertAtText` fix).
  - Clicking it while cursor is inside a list item inserts the image inside that list item (validates existing `LIST_ITEM` branch still works).
  - Without `onImageUpload` supplied, selecting a file renders the image as a base64 `<img src="data:...">`.
  - With a stub `onImageUpload` prop supplied (e.g. resolving a fixed test URL), the returned URL is used as `src` instead of base64.

## Critical Files

- src/nodes/types.ts - add `ImageNode` type and `NODE_TYPES.IMAGE`
- src/nodes/ricos.ts - replace placeholder IMAGE parsing with real conversion + Wix CDN URL
- src/nodes/commands.ts - fix `insertAtText` gap for top-level leaf-node insertion
- src/components/Editor/Editor.tsx - wire new upload button + `onImageUpload` prop, fix refocus-after-insert logic
- src/types/Ricos.ts - widen `imageData.image` typing to match real Ricos schema (width/height)
