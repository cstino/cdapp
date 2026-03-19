-- SQL Schema for CDA Fund Management

-- 1. Balance Table
CREATE TABLE IF NOT EXISTS fund_balance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 50000.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Operations Table
CREATE TABLE IF NOT EXISTS operations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(15, 2) NOT NULL,
  links TEXT,
  proposer TEXT DEFAULT 'Membro CDA',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  votes_approve INTEGER DEFAULT 0,
  votes_reject INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  date TIMESTAMPTZ DEFAULT now()
);

-- Initial record for balance
INSERT INTO fund_balance (amount) VALUES (50000.00) ON CONFLICT DO NOTHING;

-- Enable Realtime
-- In Supabase UI: Go to Database > Replicated Tables and enable for all these.
