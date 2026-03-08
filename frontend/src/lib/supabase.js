import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Auto-fix if user only provided the project reference instead of full URL
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-project-url' && supabaseUrl.startsWith('https://');

if (!isConfigured) {
    console.warn('Supabase credentials are missing or invalid. Database features will not work until REACT_APP_SUPABASE_URL (starting with https://) and REACT_APP_SUPABASE_ANON_KEY are set in frontend/.env');
}

// Export a dummy client if not configured to prevent crashes
const createDummyClient = () => {
    const chainable = () => ({
        select: chainable,
        insert: chainable,
        update: chainable,
        upsert: chainable,
        delete: chainable,
        eq: chainable,
        neq: chainable,
        gt: chainable,
        lt: chainable,
        gte: chainable,
        lte: chainable,
        like: chainable,
        ilike: chainable,
        is: chainable,
        in: chainable,
        contains: chainable,
        or: chainable,
        not: chainable,
        order: chainable,
        limit: chainable,
        range: chainable,
        single: chainable,
        maybeSingle: chainable,
        // The "end" of the chain is usually an await, so this object should be a Promise
        then: (onfulfilled) => {
            onfulfilled({ data: [], error: null, count: 0 });
            return Promise.resolve({ data: [], error: null, count: 0 });
        }
    });

    return {
        from: () => chainable(),
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }
    };
};

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createDummyClient();
