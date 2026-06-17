/**
 * @onserve/core
 *
 * Core infrastructure for the OnServe mobile app:
 * - Action registry (20+ AI-ready actions)
 * - Intent router (navigation, actions, deep links, bottom sheets)
 * - App context selectors (typed access to React Query cache)
 * - Agent bridge (dormant for Phase 2+ AI integration)
 *
 * All exports are tree-shakeable and support strict TypeScript.
 */

// Registry exports
export type { ActionContext, Action, ActionId } from './registry';
export { bookingActions, providerActions, paymentActions, locationActions, notificationActions, allActions } from './registry';

// Router exports
export type {
  NavigateIntent,
  ActionIntent,
  DeepLinkIntent,
  BottomSheetIntent,
  Intent,
  DispatchResult,
} from './router';
export {
  dispatchIntent,
  navigate,
  executeAction,
  openDeepLink,
  showBottomSheet,
  onIntent,
} from './router';

// Context exports
export { useAppContext, useAppContextSelector, contextSelectors } from './context';
export { registerToolsForAgent, executeTool, agentCapabilities } from './context/agent-bridge';
