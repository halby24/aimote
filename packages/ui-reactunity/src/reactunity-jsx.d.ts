import type { CSSProperties, ReactNode } from 'react';

/**
 * ReactUnity JSX intrinsic element declarations.
 *
 * ReactUnity renders to Unity UGUI instead of DOM.
 * Style properties use a subset of CSS (flexbox, colors, sizing, etc.).
 *
 * - `view`, `text`, `scroll` are new intrinsic elements (not in React DOM).
 * - `input` and `button` already exist in React's IntrinsicElements,
 *   so we augment InputHTMLAttributes to add ReactUnity-specific props.
 */

type UssStyle = Partial<CSSProperties>;

declare module 'react' {
  // Add ReactUnity-specific intrinsic elements
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
    }
  }

  // Augment InputHTMLAttributes with ReactUnity's onValueChange callback
  interface InputHTMLAttributes<T> {
    onValueChange?: (value: string) => void;
  }
}

export {};
