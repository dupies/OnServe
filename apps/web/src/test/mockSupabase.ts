import { vi } from 'vitest';

type Result = { data: unknown; error: { message: string } | null };

/**
 * Builds a chainable Supabase query mock where every method returns `this`
 * and the chain itself is thenable — so `await` resolves regardless of which
 * terminal method (single, order, eq, in, …) ends the chain.
 */
export function makeQueryMock(data: unknown, error: { message: string } | null = null): ChainMock {
  const result: Result = { data, error };

  const chain: ChainMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    // Make the chain itself a Promise so `await chain.<anyMethod>()` resolves
    then: (resolve: (v: Result) => void) => (Promise.resolve(result).then(resolve) as unknown) as Promise<Result>,
    catch: (reject: (e: unknown) => void) => (Promise.resolve(result).catch(reject) as unknown) as Promise<Result>,
    finally: (fn: () => void) => Promise.resolve(result).finally(fn),
  };

  return chain;
}

export type ChainMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (v: Result) => void) => Promise<Result>;
  catch: (reject: (e: unknown) => void) => Promise<Result>;
  finally: (fn: () => void) => Promise<Result>;
};

/** Builds a minimal mock of the supabase client. */
export function makeSupabaseMock() {
  const tableHandlers = new Map<string, ChainMock>();
  let defaultHandler = makeQueryMock([]);

  const mock = {
    from: vi.fn((table: string) => tableHandlers.get(table) ?? defaultHandler),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    _setTable: (table: string, data: unknown, error: { message: string } | null = null) => {
      tableHandlers.set(table, makeQueryMock(data, error));
    },
    _setDefault: (data: unknown, error: { message: string } | null = null) => {
      defaultHandler = makeQueryMock(data, error);
    },
  };
  return mock;
}

export type SupabaseMock = ReturnType<typeof makeSupabaseMock>;
