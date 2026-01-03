import React, { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that handles ChunkLoadErrors by reloading the page.
 * This is useful for SPAs when a new deployment happens and old chunks are removed.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      window.sessionStorage.getItem('page-has-been-reloaded') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-reloaded', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenReloaded) {
        // The error might be a ChunkLoadError because the server was updated
        window.sessionStorage.setItem('page-has-been-reloaded', 'true');
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }

      // If we already reloaded and it's still failing, throw the error
      throw error;
    }
  });
}
