-- Create users table
create table users (
    id uuid default uuid_generate_v4() primary key,
    whatsapp_id text unique not null,
    data jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create presentations table
create table presentations (
    id uuid default uuid_generate_v4() primary key,
    whatsapp_id text not null,
    title text not null,
    topics jsonb not null,
    presentation_url text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key constraint
alter table presentations
    add constraint presentations_whatsapp_id_fkey
    foreign key (whatsapp_id) references users(whatsapp_id);

-- Create indexes
create index idx_users_whatsapp_id on users(whatsapp_id);
create index idx_presentations_whatsapp_id on presentations(whatsapp_id);
create index idx_presentations_created_at on presentations(created_at);

-- Enable RLS
alter table users enable row level security;
alter table presentations enable row level security;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert their own presentations" ON presentations;

-- Create policies for anonymous access
CREATE POLICY "Allow anonymous read access to users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert access to users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to users"
    ON users FOR UPDATE
    USING (true);

CREATE POLICY "Allow anonymous read access to presentations"
    ON presentations FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert access to presentations"
    ON presentations FOR INSERT
    WITH CHECK (true);
