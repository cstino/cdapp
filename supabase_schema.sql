-- RESET TOTALE E DEFINITIVO CDA (USO SQL AGGRESSIVO)
-- Questo script pulisce OGNI singola regola e funzione precedente per evitare conflitti.

-- 1. Tabula rasa delle policy (evita ogni possibile recursione residua)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. Pulizia funzioni e tabelle
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS complete_operation(uuid) CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS operations CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS fund_balance CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Creazione Tabella Profili (Fondamentale per Auth)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Funzione Admin SICURA (SECURITY DEFINER = bypassa RLS internamente)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Regole Profili (Semplici, senza recursione)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 6. Altre Tabelle
CREATE TABLE fund_balance (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  amount NUMERIC(15, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO fund_balance (id, amount) VALUES ('00000000-0000-0000-0000-000000000001', 5000);

CREATE TABLE operations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(15, 2) NOT NULL,
  links TEXT,
  proposer TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ops_read" ON operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops_insert" ON operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ops_update_admin" ON operations FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "ops_delete_admin" ON operations FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "ops_delete_owner" ON operations FOR DELETE TO authenticated USING (
  proposer = (SELECT username FROM profiles WHERE id = auth.uid())
);

CREATE TABLE votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  operation_id uuid REFERENCES operations ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('approve', 'reject')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, operation_id)
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_read" ON votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes_manage_self" ON votes FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  date TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trans_read" ON transactions FOR SELECT TO authenticated USING (true);

-- 7. Logica Atomica
CREATE OR REPLACE FUNCTION complete_operation(op_id uuid)
RETURNS void AS $$
DECLARE
  op_cost NUMERIC;
  op_title TEXT;
BEGIN
  SELECT cost, title INTO op_cost, op_title FROM operations WHERE id = op_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operazione non approvata o non trovata.'; END IF;
  UPDATE fund_balance SET amount = amount - op_cost;
  INSERT INTO transactions (type, description, amount) VALUES ('out', op_title, op_cost);
  UPDATE operations SET status = 'completed' WHERE id = op_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
