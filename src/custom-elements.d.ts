/**
 * JSX type declarations for Google Maps Place UI Kit web components.
 * These custom elements are registered by the Maps JavaScript API.
 * Declaring them here removes the need for @ts-ignore on every usage.
 *
 * The `export {}` makes this a MODULE file so that `declare module` below
 * augments (merges with) the existing react/jsx-runtime types rather than
 * overriding them — a critical distinction for TypeScript module augmentation.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export {};

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      /** Nearby search component — renders a list of places based on map bounds */
      'gmp-place-search': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        selectable?: '' | boolean;
      };
      /** Renders all available content for a place */
      'gmp-place-all-content': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      /** Configures nearby-search parameters (locationRestriction, includedTypes, etc.) */
      'gmp-place-nearby-search-request': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      /** Compact place-details card — horizontal or vertical layout */
      'gmp-place-details-compact': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'internal-usage-attribution-ids'?: string;
        orientation?: 'HORIZONTAL' | 'VERTICAL';
      };
      /** Specifies which place to display inside a details component */
      'gmp-place-details-place-request': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        place?: string;
      };
    }
  }
}
