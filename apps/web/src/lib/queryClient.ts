import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { notify } from './notify';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => notify.error(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => notify.error(error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

