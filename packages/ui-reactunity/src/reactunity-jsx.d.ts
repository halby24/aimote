import type { CSSProperties, ReactNode } from 'react';

/**
 * ReactUnity JSX intrinsic element declarations.
 *
 * ReactUnity renders to Unity UGUI instead of DOM.
 * Style properties use a subset of CSS (flexbox, colors, sizing, etc.).
 *
 * - `view`, `text`, `scroll` are new intrinsic elements (not in React DOM).
 * - `input` and `button` are overridden from React DOM to use ReactUnity's
 *   callback signatures (e.g. onChange receives string, not ChangeEvent).
 */

type UssStyle = Partial<CSSProperties>;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      view: {
        style?: UssStyle;
        children?: ReactNode;
        onClick?: () => void;
        key?: string | number;
      };
      text: {
        style?: UssStyle;
        children?: ReactNode;
        key?: string | number;
      };
      scroll: {
        style?: UssStyle;
        children?: ReactNode;
        key?: string | number;
      };
      // Override DOM <input> with ReactUnity's UGUI InputComponent API
      input: {
        style?: UssStyle;
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        readonly?: boolean;
        /** Fires when text content changes. Signature: (value, sender?) */
        onChange?: (value: string, sender?: unknown) => void;
        /** Fires when the user presses Enter / Return */
        onReturn?: (value: string, sender?: unknown) => void;
        onEndEdit?: (value: string, sender?: unknown) => void;
        key?: string | number;
      };
      // Override DOM <button> with ReactUnity's UGUI ButtonComponent API
      button: {
        style?: UssStyle;
        children?: ReactNode;
        onClick?: (sender?: unknown) => void;
        disabled?: boolean;
        key?: string | number;
      };
    }
  }
}

export {};
