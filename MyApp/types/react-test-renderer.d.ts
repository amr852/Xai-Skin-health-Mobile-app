/**
 * Minimal ambient declaration for react-test-renderer (used only by Jest
 * suites). The installed version ships no types and we avoid adding
 * @types/react-test-renderer for test-only usage. Only the surface used by
 * __tests__/useLiveDetect.test.ts is typed.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  namespace TestRenderer {
    interface ReactTestRenderer {
      unmount(): void;
      update(element: ReactElement): void;
      toJSON(): unknown;
    }
    function create(element: ReactElement): ReactTestRenderer;
    function act(callback: () => Promise<void> | void): Promise<void>;
  }

  export function create(element: ReactElement): TestRenderer.ReactTestRenderer;
  export function act(callback: () => Promise<void> | void): Promise<void>;
  export type ReactTestRenderer = TestRenderer.ReactTestRenderer;
  export default TestRenderer;
}
