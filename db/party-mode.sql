-- Party Mode Tables

-- Rooms table
CREATE TABLE IF NOT EXISTS public.party_rooms (
    room_code TEXT PRIMARY KEY,
    host_address TEXT NOT NULL,
    host_name TEXT,
    host_pfp TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, completed
    game_state JSONB, -- current board state
    current_turn TEXT, -- address of player whose turn it is
    winner_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    player_count INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 2
);

-- Room players table
CREATE TABLE IF NOT EXISTS public.party_room_players (
    room_code TEXT REFERENCES public.party_rooms(room_code) ON DELETE CASCADE,
    player_address TEXT NOT NULL,
    player_name TEXT,
    player_pfp TEXT,
    player_symbol TEXT NOT NULL, -- 'X' or 'O'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_code, player_address)
);

-- Function to update room's updated_at timestamp
CREATE OR REPLACE FUNCTION update_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update room's updated_at
CREATE TRIGGER update_room_timestamp
    BEFORE UPDATE ON public.party_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_room_timestamp();

-- RLS Policies
ALTER TABLE public.party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_room_players ENABLE ROW LEVEL SECURITY;

-- Anyone can read rooms and players
CREATE POLICY "Anyone can read rooms"
    ON public.party_rooms
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can read room players"
    ON public.party_room_players
    FOR SELECT
    USING (true);

-- Only host can update their room
CREATE POLICY "Host can update room"
    ON public.party_rooms
    FOR UPDATE
    USING (auth.uid()::text = host_address);

-- Players can update their own player record
CREATE POLICY "Players can update their record"
    ON public.party_room_players
    FOR UPDATE
    USING (auth.uid()::text = player_address);

-- Anyone can insert (will be validated in API)
CREATE POLICY "Anyone can insert room"
    ON public.party_rooms
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can join room"
    ON public.party_room_players
    FOR INSERT
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_party_rooms_status ON public.party_rooms(status);
CREATE INDEX IF NOT EXISTS idx_party_rooms_host ON public.party_rooms(host_address);
CREATE INDEX IF NOT EXISTS idx_party_room_players_player ON public.party_room_players(player_address);
