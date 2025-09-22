-- WordWave Database Schema
-- Complete schema for word chain building game

-- Users table (enhanced from ZeroX)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farcaster_id text UNIQUE,
  username text,
  display_name text,
  avatar_url text,
  level integer DEFAULT 1,
  total_xp integer DEFAULT 0,
  coins integer DEFAULT 100,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  daily_streak integer DEFAULT 0,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Word Dictionary table
CREATE TABLE IF NOT EXISTS public.word_dictionary (
  word varchar(50) PRIMARY KEY,
  definition text,
  difficulty_level integer DEFAULT 1,
  category varchar(30),
  usage_count integer DEFAULT 0,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Games table (modified from ZeroX)
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE,
  game_mode varchar(20) NOT NULL, -- 'party', 'daily', 'practice', 'tournament'
  status varchar(20) DEFAULT 'waiting', -- 'waiting', 'active', 'completed', 'cancelled'
  theme varchar(50),
  word_chain_data jsonb DEFAULT '[]'::jsonb,
  current_word text,
  current_player_id uuid,
  final_chain_length integer DEFAULT 0,
  words_used text[] DEFAULT '{}',
  max_players integer DEFAULT 2,
  turn_duration integer DEFAULT 30,
  game_duration integer DEFAULT 300, -- 5 minutes
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Game Participants table
CREATE TABLE IF NOT EXISTS public.game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  player_order integer,
  score integer DEFAULT 0,
  words_played integer DEFAULT 0,
  is_winner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Game Words table (tracks each word played)
CREATE TABLE IF NOT EXISTS public.game_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  word_order integer,
  points_earned integer DEFAULT 0,
  time_taken integer, -- seconds
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Daily Challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  challenge_date date PRIMARY KEY,
  challenge_type varchar(30) NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  target_score integer,
  theme varchar(50),
  starting_word text,
  target_chain_length integer,
  created_at timestamptz DEFAULT now()
);

-- Daily Challenge Attempts table
CREATE TABLE IF NOT EXISTS public.daily_challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_date date REFERENCES public.daily_challenges(challenge_date),
  score integer DEFAULT 0,
  chain_length integer DEFAULT 0,
  words_used text[] DEFAULT '{}',
  completed boolean DEFAULT false,
  completion_time integer, -- seconds
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

-- Player Vocabulary table (tracks words used by each player)
CREATE TABLE IF NOT EXISTS public.player_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  word varchar(50) NOT NULL,
  times_used integer DEFAULT 1,
  first_used timestamptz DEFAULT now(),
  games_won_with integer DEFAULT 0,
  total_points_earned integer DEFAULT 0,
  UNIQUE(user_id, word)
);

-- Player Achievements table
CREATE TABLE IF NOT EXISTS public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_key varchar(50) NOT NULL,
  achievement_name text NOT NULL,
  description text,
  earned_at timestamptz DEFAULT now(),
  progress_data jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_key)
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tournament_type varchar(30) DEFAULT 'single_elimination',
  entry_fee integer DEFAULT 100,
  prize_pool integer DEFAULT 0,
  max_participants integer DEFAULT 16,
  status varchar(20) DEFAULT 'registration', -- 'registration', 'active', 'completed'
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_games_room_code ON public.games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_mode ON public.games(game_mode);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON public.game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_words_game_id ON public.game_words(game_id);
CREATE INDEX IF NOT EXISTS idx_game_words_user_id ON public.game_words(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_player_vocabulary_user_word ON public.player_vocabulary(user_id, word);
CREATE INDEX IF NOT EXISTS idx_users_farcaster_id ON public.users(farcaster_id);
CREATE INDEX IF NOT EXISTS idx_word_dictionary_word ON public.word_dictionary(word);
CREATE INDEX IF NOT EXISTS idx_achievements_user_key ON public.player_achievements(user_id, achievement_key);
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON public.users(level DESC, total_xp DESC);

-- Stored Functions
CREATE OR REPLACE FUNCTION public.update_user_stats(
  p_user_id uuid,
  p_xp_gained integer,
  p_game_won boolean,
  p_words_played integer
) RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET 
    total_xp = total_xp + p_xp_gained,
    level = LEAST(100, 1 + (total_xp + p_xp_gained) / 100),
    games_played = games_played + 1,
    games_won = CASE WHEN p_game_won THEN games_won + 1 ELSE games_won END,
    last_active = now(),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_word_chain(
  p_game_id uuid,
  p_word text,
  p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_current_word text;
  v_last_letter char(1);
  v_first_letter char(1);
  v_word_exists boolean;
  v_word_used boolean;
  v_result jsonb;
BEGIN
  -- Get current word from game
  SELECT current_word INTO v_current_word
  FROM public.games 
  WHERE id = p_game_id;
  
  -- Check if word exists in dictionary
  SELECT EXISTS(
    SELECT 1 FROM public.word_dictionary 
    WHERE word = LOWER(p_word) AND is_valid = true
  ) INTO v_word_exists;
  
  -- Check if word already used in this game
  SELECT EXISTS(
    SELECT 1 FROM public.game_words 
    WHERE game_id = p_game_id AND LOWER(word) = LOWER(p_word)
  ) INTO v_word_used;
  
  -- Validate chain rule
  IF v_current_word IS NOT NULL THEN
    v_last_letter := LOWER(RIGHT(v_current_word, 1));
    v_first_letter := LOWER(LEFT(p_word, 1));
  ELSE
    v_last_letter := NULL;
    v_first_letter := LOWER(LEFT(p_word, 1));
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'valid', v_word_exists AND NOT v_word_used AND (v_current_word IS NULL OR v_last_letter = v_first_letter),
    'word_exists', v_word_exists,
    'word_used', v_word_used,
    'chain_valid', (v_current_word IS NULL OR v_last_letter = v_first_letter),
    'expected_first_letter', v_last_letter
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_word_score(
  p_word text,
  p_time_taken integer DEFAULT 30
) RETURNS integer AS $$
DECLARE
  v_base_score integer;
  v_bonus_multiplier numeric := 1.0;
  v_final_score integer;
  v_word_length integer;
  v_difficulty integer;
BEGIN
  v_word_length := LENGTH(p_word);
  v_base_score := v_word_length;
  
  -- Get word difficulty
  SELECT difficulty_level INTO v_difficulty
  FROM public.word_dictionary
  WHERE word = LOWER(p_word);
  
  -- Apply bonuses
  -- Long word bonus (8+ letters)
  IF v_word_length >= 8 THEN
    v_bonus_multiplier := v_bonus_multiplier * 1.3;
  END IF;
  
  -- Speed bonus (under 10 seconds)
  IF p_time_taken < 10 THEN
    v_bonus_multiplier := v_bonus_multiplier * 1.2;
  END IF;
  
  -- Difficulty bonus
  IF v_difficulty >= 3 THEN
    v_bonus_multiplier := v_bonus_multiplier * 1.5;
  END IF;
  
  -- Special word bonuses
  -- Palindrome check
  IF LOWER(p_word) = REVERSE(LOWER(p_word)) AND v_word_length > 3 THEN
    v_base_score := v_base_score + 5;
  END IF;
  
  v_final_score := ROUND(v_base_score * v_bonus_multiplier);
  
  RETURN GREATEST(v_final_score, 1);
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET last_active = now(), updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_word_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.word_dictionary 
  SET usage_count = usage_count + 1
  WHERE word = LOWER(NEW.word);
  
  -- Update player vocabulary
  INSERT INTO public.player_vocabulary (user_id, word, times_used, first_used)
  VALUES (NEW.user_id, LOWER(NEW.word), 1, now())
  ON CONFLICT (user_id, word) 
  DO UPDATE SET 
    times_used = player_vocabulary.times_used + 1;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_user_last_active ON public.game_participants;
CREATE TRIGGER trg_update_user_last_active
  AFTER INSERT ON public.game_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_user_last_active();

DROP TRIGGER IF EXISTS trg_increment_word_usage ON public.game_words;
CREATE TRIGGER trg_increment_word_usage
  AFTER INSERT ON public.game_words
  FOR EACH ROW EXECUTE FUNCTION public.increment_word_usage();

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_dictionary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true);
CREATE POLICY "Anyone can read participants" ON public.game_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join games" ON public.game_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read words" ON public.game_words FOR SELECT USING (true);
CREATE POLICY "Anyone can submit words" ON public.game_words FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read dictionary" ON public.word_dictionary FOR SELECT USING (true);
CREATE POLICY "Anyone can read daily challenges" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "Users can read own attempts" ON public.daily_challenge_attempts FOR SELECT USING (true);
CREATE POLICY "Users can create attempts" ON public.daily_challenge_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own vocabulary" ON public.player_vocabulary FOR SELECT USING (true);
CREATE POLICY "Users can read own achievements" ON public.player_achievements FOR SELECT USING (true);

-- Insert sample dictionary words
INSERT INTO public.word_dictionary (word, definition, difficulty_level, category) VALUES
('apple', 'A round fruit with red or green skin', 1, 'food'),
('elephant', 'A large mammal with a trunk', 1, 'animal'),
('table', 'A piece of furniture with a flat top', 1, 'furniture'),
('energy', 'The capacity to do work', 2, 'science'),
('yellow', 'A bright color like the sun', 1, 'color'),
('wonderful', 'Extremely good or pleasant', 2, 'adjective'),
('library', 'A building containing books', 2, 'building'),
('yesterday', 'The day before today', 2, 'time'),
('youthful', 'Having the characteristics of youth', 2, 'adjective'),
('lighthouse', 'A tower with a bright light to guide ships', 2, 'building')
ON CONFLICT (word) DO NOTHING;