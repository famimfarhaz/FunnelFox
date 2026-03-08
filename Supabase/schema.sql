-- FunnelFox Supabase Schema
-- Migration from LocalStorage to Relational Database

-- 1. Contacts Table (Business Leads)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    real_website TEXT,
    is_social_only BOOLEAN DEFAULT FALSE,
    location TEXT,
    business_type TEXT,
    rating NUMERIC,
    reviews INTEGER,
    needs_website TEXT CHECK (needs_website IN ('YES', 'NO')),
    needs_saas TEXT CHECK (needs_saas IN ('YES', 'NO')),
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Customer', 'Lost')),
    lost_reason TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    collected_at TIMESTAMPTZ DEFAULT now(),
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for search performance
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (name);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts (status);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts (is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_collected_at ON contacts (collected_at);

-- Unique constraint for upsert (Migration support)
ALTER TABLE contacts ADD CONSTRAINT contacts_name_website_key UNIQUE (name, website);

-- 2. Campaigns Table (Templates)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for upsert
ALTER TABLE campaigns ADD CONSTRAINT campaigns_name_key UNIQUE (name);

-- 3. Outreach Logs (Email History)
CREATE TABLE IF NOT EXISTS outreach_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    subject TEXT,
    message TEXT,
    status TEXT CHECK (status IN ('Sent', 'Failed')),
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for logs
CREATE INDEX IF NOT EXISTS idx_outreach_contact_id ON outreach_logs (contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach_logs (sent_at);

-- 4. Search History (Discovery Logs)
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT,
    business_type TEXT,
    count_requested INTEGER,
    leads_found INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for history
CREATE INDEX IF NOT EXISTS idx_search_created_at ON search_history (created_at);

-- Row Level Security (RLS) - Basic setup (Enable and allow all for now as it's a single-user tool)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (simplest for internal agency tools)
-- In a multi-tenant app, we would add auth.uid() checks here.
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true);
CREATE POLICY "Allow all on outreach_logs" ON outreach_logs FOR ALL USING (true);
CREATE POLICY "Allow all on search_history" ON search_history FOR ALL USING (true);
