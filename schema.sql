CREATE SCHEMA IF NOT EXISTS pocket;
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
