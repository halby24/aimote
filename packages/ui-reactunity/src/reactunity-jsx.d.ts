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

interface BaseProps {
  style?: UssStyle;
  className?: string;
  children?: ReactNode;
  key?: string | number;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      view: BaseProps & {
        onClick?: () => void;
      };
      text: BaseProps;
      scroll: BaseProps;
      // Override DOM <input> with ReactUnity's UGUI InputComponent API
      input: Omit<BaseProps, 'children'> & {
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        readonly?: boolean;
        /** Fires when text content changes. Signature: (value, sender?) */
        onChange?: (value: string, sender?: unknown) => void;
        /** Fires when the user presses Enter / Return */
        onReturn?: (value: string, sender?: unknown) => void;
        onEndEdit?: (value: string, sender?: unknown) => void;
      };
      // Override DOM <button> with ReactUnity's UGUI ButtonComponent API
      button: BaseProps & {
        onClick?: (sender?: unknown) => void;
        disabled?: boolean;
      };
    }
  }
}

export {};
