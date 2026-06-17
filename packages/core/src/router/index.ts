import type { ActionId, ActionContext } from '../registry';

/**
 * Navigation intent for routing to screens.
 */
export interface NavigateIntent {
  type: 'navigate';
  screen: string;
  params: Record<string, string | number | boolean> | undefined;
}

/**
 * Action intent for executing registry actions.
 */
export interface ActionIntent {
  type: 'action';
  actionId: ActionId;
  params: any;
}

/**
 * Deep link intent for opening URLs.
 */
export interface DeepLinkIntent {
  type: 'deepLink';
  url: string;
}

/**
 * Bottom sheet intent for showing modals.
 */
export interface BottomSheetIntent {
  type: 'showBottomSheet';
  sheetId: string;
  params: Record<string, unknown> | undefined;
}

/**
 * Union of all intent types the router can handle.
 */
export type Intent = NavigateIntent | ActionIntent | DeepLinkIntent | BottomSheetIntent;

/**
 * Result of intent dispatching.
 */
export interface DispatchResult {
  success: boolean;
  error?: Error;
  data?: any;
}

/**
 * Global intent listeners for cross-component communication.
 * Used to emit bottom sheet and modal events from anywhere in the app.
 */
const intentListeners = new Map<string, (intent: Intent) => void>();

/**
 * Subscribe to intent events.
 * Useful for components that need to respond to intents globally.
 */
export function onIntent(eventType: string, handler: (intent: Intent) => void) {
  const key = `${eventType}-${Math.random()}`;
  intentListeners.set(key, handler);
  return () => intentListeners.delete(key);
}

/**
 * Emit intent to all subscribed listeners.
 */
function emitIntent(intent: Intent) {
  for (const listener of intentListeners.values()) {
    listener(intent);
  }
}

/**
 * Dispatch an intent to the router.
 * Handles navigation, actions, deep links, and bottom sheets.
 *
 * @param intent - The intent to dispatch
 * @param context - Action context for executing registry actions
 * @returns Result of the intent dispatch
 */
export async function dispatchIntent(intent: Intent, context?: ActionContext): Promise<DispatchResult> {
  try {
    switch (intent.type) {
      case 'navigate': {
        // Dynamically import router to avoid hard dependency on expo-router
        // This allows @onserve/core to work in non-React Native environments
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const routerModule = require('expo-router');
          const router = routerModule.router || routerModule.default?.router;
          if (router?.push) {
            router.push({
              pathname: intent.screen,
              params: intent.params ?? undefined,
            });
          }
        } catch {
          // Router not available (non-native environment)
          console.warn(`Navigation to ${intent.screen} not available in this environment`);
        }
        return { success: true };
      }

      case 'action': {
        if (!context) {
          return {
            success: false,
            error: new Error('Action context required for action intents'),
          };
        }

        // Dynamically import registry to avoid circular dependencies
        const { allActions: actions } = await import('../registry');
        const action = actions[intent.actionId as keyof typeof actions];

        if (!action) {
          return {
            success: false,
            error: new Error(`Unknown action: ${String(intent.actionId)}`),
          };
        }

        // Validate parameters against schema
        const validatedParams = action.parameters.parse(intent.params);

        // Execute action
        const result = await action.execute(validatedParams, context);

        return {
          success: true,
          data: result,
        };
      }

      case 'deepLink': {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const routerModule = require('expo-router');
          const router = routerModule.router || routerModule.default?.router;
          if (router?.push) {
            router.push(intent.url);
          }
        } catch {
          // Router not available (non-native environment)
          console.warn(`Deep link to ${intent.url} not available in this environment`);
        }
        return { success: true };
      }

      case 'showBottomSheet': {
        emitIntent(intent);
        return { success: true };
      }

      default: {
        const _exhaustiveCheck: never = intent;
        return _exhaustiveCheck;
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * Convenience function to navigate to a screen.
 */
export function navigate(screen: string, params?: Record<string, string | number | boolean>) {
  return dispatchIntent({ type: 'navigate', screen, params: params ?? undefined });
}

/**
 * Convenience function to execute an action.
 */
export async function executeAction(
  actionId: ActionId,
  params: any,
  context: ActionContext
): Promise<DispatchResult> {
  return dispatchIntent({ type: 'action', actionId, params }, context);
}

/**
 * Convenience function to open a deep link.
 */
export function openDeepLink(url: string) {
  return dispatchIntent({ type: 'deepLink', url });
}

/**
 * Convenience function to show a bottom sheet.
 */
export function showBottomSheet(sheetId: string, params?: Record<string, unknown>) {
  return dispatchIntent({ type: 'showBottomSheet', sheetId, params: params ?? undefined });
}
