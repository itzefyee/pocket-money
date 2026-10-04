CREATE SCHEMA IF NOT EXISTS pocket;
CREATE TABLE IF NOT EXISTS pocket.sessions (
 token_hash text PRIMARY KEY,
 password_tag text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON pocket.sessions (expires_at);
CREATE TABLE IF NOT EXISTS pocket.workspaces (
 id smallint PRIMARY KEY CHECK (id = 1),
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 metadata jsonb NOT NULL DEFAULT '{"version":1}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pocket.settings (
 workspace_id smallint PRIMARY KEY REFERENCES pocket.workspaces(id),
 name text NOT NULL,
 currency text NOT NULL CHECK (currency IN ('MYR','USD','SGD','EUR','GBP')),
 extra jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS pocket.accounts (
 workspace_id smallint NOT NULL REFERENCES pocket.workspaces(id),
 id text NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 kind text,
 opening_cents bigint NOT NULL CHECK (opening_cents BETWEEN -9007199254740991 AND 9007199254740991),
 position integer NOT NULL,
 extra jsonb NOT NULL DEFAULT '{}',
 PRIMARY KEY (workspace_id, id)
);
CREATE TABLE IF NOT EXISTS pocket.transactions (
 workspace_id smallint NOT NULL REFERENCES pocket.workspaces(id),
 id text NOT NULL,
 date date NOT NULL,
 merchant text NOT NULL CHECK (length(merchant) BETWEEN 1 AND 200),
 amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 99999999999),
 type text NOT NULL CHECK (type IN ('income','expense','transfer')),
 category text NOT NULL CHECK (category IN ('Food & drinks','Groceries','Shopping','Transport','Bills & home','Health & fitness','Entertainment','Travel','Other','Salary','Freelance')),
 account_id text NOT NULL,
 to_account_id text,
 note text NOT NULL DEFAULT '',
 position integer NOT NULL,
 extra jsonb NOT NULL DEFAULT '{}',
 PRIMARY KEY (workspace_id, id),
 FOREIGN KEY (workspace_id, account_id) REFERENCES pocket.accounts(workspace_id, id),
 FOREIGN KEY (workspace_id, to_account_id) REFERENCES pocket.accounts(workspace_id, id),
 CHECK (type <> 'transfer' OR (to_account_id IS NOT NULL AND account_id <> to_account_id))
);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON pocket.transactions (workspace_id, date);
CREATE INDEX IF NOT EXISTS transactions_account_idx ON pocket.transactions (workspace_id, account_id);
CREATE TABLE IF NOT EXISTS pocket.budgets (
 workspace_id smallint NOT NULL REFERENCES pocket.workspaces(id),
 category text NOT NULL CHECK (category IN ('Food & drinks','Groceries','Shopping','Transport','Bills & home','Health & fitness','Entertainment','Travel','Other','Salary','Freelance')),
 amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY (workspace_id, category)
);
CREATE TABLE IF NOT EXISTS pocket.goals (
 workspace_id smallint NOT NULL REFERENCES pocket.workspaces(id),
 id text NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
 target_cents bigint NOT NULL CHECK (target_cents BETWEEN 1 AND 9007199254740991),
 saved_cents bigint NOT NULL CHECK (saved_cents BETWEEN 0 AND 9007199254740991),
 position integer NOT NULL,
 extra jsonb NOT NULL DEFAULT '{}',
 PRIMARY KEY (workspace_id, id)
);

-- Keep workspace 1 and its sessions for the original Pocket login.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pocket' AND table_name='workspaces' AND column_name='id' AND data_type='smallint') THEN
  ALTER TABLE pocket.workspaces DROP CONSTRAINT IF EXISTS workspaces_id_check;
  ALTER TABLE pocket.workspaces ALTER COLUMN id TYPE bigint;
  ALTER TABLE pocket.settings ALTER COLUMN workspace_id TYPE bigint;
  ALTER TABLE pocket.accounts ALTER COLUMN workspace_id TYPE bigint;
  ALTER TABLE pocket.transactions ALTER COLUMN workspace_id TYPE bigint;
  ALTER TABLE pocket.budgets ALTER COLUMN workspace_id TYPE bigint;
  ALTER TABLE pocket.goals ALTER COLUMN workspace_id TYPE bigint;
 END IF;
END $$;
CREATE SEQUENCE IF NOT EXISTS pocket.workspace_ids START WITH 2;
CREATE TABLE IF NOT EXISTS pocket.users (
 id text PRIMARY KEY,
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$' AND username <> 'pocket'),
 password_hash text NOT NULL,
 workspace_id bigint NOT NULL UNIQUE REFERENCES pocket.workspaces(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pocket.sessions ADD COLUMN IF NOT EXISTS user_id text REFERENCES pocket.users(id);
