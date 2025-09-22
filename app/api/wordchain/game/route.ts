import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { WordChainUtils } from "@/lib/wordChainLogic";

// Type definitions
interface GameParticipant {
  id: string;
  user_id: string;
  player_order: number;
  score: number;
  words_played: number;
  is_winner: boolean;
  users?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface GameWord {
  id: string;
  word: string;
  word_order: number;
  points_earned: number;
  time_taken: number;
  user_id: string;
  created_at: string;
}

interface Game {
  id: string;
  room_code: string;
  game_mode: string;
  status: string;
  theme?: string;
  current_word?: string;
  current_player_id?: string;
  word_chain_data?: unknown[];
  final_chain_length?: number;
  words_used?: string[];
  max_players: number;
  turn_duration: number;
  game_duration: number;
  started_at?: string;
  ended_at?: string;
  participants: GameParticipant[];
  words: GameWord[];
}

interface SubmitWordData {
  word: string;
  timeTaken?: number;
}

// Create a new game
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hostId,
      gameMode = "party",
      theme = null,
      maxPlayers = 2,
      turnDuration = 30,
      gameDuration = 300,
    } = body;

    if (!hostId) {
      return NextResponse.json({ error: "Host ID required" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 },
      );
    }

    const roomCode = WordChainUtils.generateRoomCode();

    // Create game
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        room_code: roomCode,
        game_mode: gameMode,
        theme,
        max_players: maxPlayers,
        turn_duration: turnDuration,
        game_duration: gameDuration,
        status: "waiting",
      })
      .select()
      .single();

    if (gameError) {
      console.error("Game creation error:", gameError);
      return NextResponse.json(
        { error: "Failed to create game" },
        { status: 500 },
      );
    }

    // Add host as first participant
    const { error: participantError } = await supabase
      .from("game_participants")
      .insert({
        game_id: game.id,
        user_id: hostId,
        player_order: 0,
      });

    if (participantError) {
      console.error("Participant creation error:", participantError);
      return NextResponse.json(
        { error: "Failed to add host to game" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        roomCode: game.room_code,
        gameMode: game.game_mode,
        theme: game.theme,
        status: game.status,
        maxPlayers: game.max_players,
        turnDuration: game.turn_duration,
        gameDuration: game.game_duration,
      },
    });
  } catch (error) {
    console.error("Game creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get game state
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const roomCode = searchParams.get("roomCode");

    if (!gameId && !roomCode) {
      return NextResponse.json(
        { error: "Game ID or room code required" },
        { status: 400 },
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 },
      );
    }

    // Build query
    let query = supabase.from("games").select(`
        *,
        participants:game_participants(
          id,
          user_id,
          player_order,
          score,
          words_played,
          is_winner,
          users(username, display_name, avatar_url)
        ),
        words:game_words(
          id,
          word,
          word_order,
          points_earned,
          time_taken,
          user_id,
          created_at
        )
      `);

    if (gameId) {
      query = query.eq("id", gameId);
    } else {
      query = query.eq("room_code", roomCode);
    }

    const { data: game, error } = await query.single();

    if (error || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Format response
    const formattedGame = {
      id: game.id,
      roomCode: game.room_code,
      gameMode: game.game_mode,
      status: game.status,
      theme: game.theme,
      currentWord: game.current_word,
      currentPlayerId: game.current_player_id,
      wordChainData: game.word_chain_data || [],
      finalChainLength: game.final_chain_length,
      wordsUsed: game.words_used || [],
      maxPlayers: game.max_players,
      turnDuration: game.turn_duration,
      gameDuration: game.game_duration,
      startedAt: game.started_at,
      endedAt: game.ended_at,
      participants: game.participants.map((p: GameParticipant) => ({
        id: p.id,
        userId: p.user_id,
        playerOrder: p.player_order,
        score: p.score,
        wordsPlayed: p.words_played,
        isWinner: p.is_winner,
        user: p.users,
      })),
      words: game.words.map((w: GameWord) => ({
        id: w.id,
        word: w.word,
        order: w.word_order,
        points: w.points_earned,
        timeTaken: w.time_taken,
        userId: w.user_id,
        createdAt: w.created_at,
      })),
    };

    return NextResponse.json({
      success: true,
      game: formattedGame,
    });
  } catch (error) {
    console.error("Game fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Update game (join, start, end)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, action, userId, ...actionData } = body;

    if (!gameId || !action) {
      return NextResponse.json(
        { error: "Game ID and action required" },
        { status: 400 },
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 },
      );
    }

    switch (action) {
      case "join":
        return await handleJoinGame(gameId, userId);

      case "start":
        return await handleStartGame(gameId);

      case "submit_word":
        return await handleSubmitWord(
          gameId,
          userId,
          actionData as SubmitWordData,
        );

      case "skip_turn":
        return await handleSkipTurn(gameId, userId);

      case "end":
        return await handleEndGame(gameId);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Game update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleJoinGame(gameId: string, userId: string) {
  if (!supabase) throw new Error("Database not available");

  // Check if game exists and has space
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*, participants:game_participants(count)")
    .eq("id", gameId)
    .eq("status", "waiting")
    .single();

  if (gameError || !game) {
    return NextResponse.json(
      { error: "Game not found or not available" },
      { status: 404 },
    );
  }

  const participantCount = game.participants[0]?.count || 0;
  if (participantCount >= game.max_players) {
    return NextResponse.json({ error: "Game is full" }, { status: 400 });
  }

  // Check if user already joined
  const { data: existingParticipant } = await supabase
    .from("game_participants")
    .select("id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .single();

  if (existingParticipant) {
    return NextResponse.json(
      { error: "Already joined this game" },
      { status: 400 },
    );
  }

  // Add participant
  const { error: joinError } = await supabase.from("game_participants").insert({
    game_id: gameId,
    user_id: userId,
    player_order: participantCount,
  });

  if (joinError) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Successfully joined game",
  });
}

async function handleStartGame(gameId: string) {
  if (!supabase) throw new Error("Database not available");

  // Check if game can be started
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*, participants:game_participants(*)")
    .eq("id", gameId)
    .eq("status", "waiting")
    .single();

  if (gameError || !game) {
    return NextResponse.json(
      { error: "Game not found or already started" },
      { status: 404 },
    );
  }

  if (game.participants.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 players to start" },
      { status: 400 },
    );
  }

  // Start the game
  const firstPlayer = game.participants.find(
    (p: GameParticipant) => p.player_order === 0,
  );

  const { error: updateError } = await supabase
    .from("games")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      current_player_id: firstPlayer?.user_id,
    })
    .eq("id", gameId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Game started",
    currentPlayerId: firstPlayer?.user_id,
  });
}

async function handleSubmitWord(
  gameId: string,
  userId: string,
  actionData: SubmitWordData,
) {
  if (!supabase) throw new Error("Database not available");

  const { word, timeTaken = 30 } = actionData;

  if (!word) {
    return NextResponse.json({ error: "Word required" }, { status: 400 });
  }

  // Validate word first
  const validationResponse = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/wordchain/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, gameId, userId }),
    },
  );

  const validation = await validationResponse.json();

  if (!validation.valid) {
    return NextResponse.json({
      success: false,
      errors: validation.errors,
    });
  }

  // Calculate score
  const { data: scoreData } = await supabase.rpc("calculate_word_score", {
    p_word: word,
    p_time_taken: timeTaken,
  });

  const score = scoreData || word.length;

  // Get current game state
  const { data: game } = await supabase
    .from("games")
    .select("*, participants:game_participants(*)")
    .eq("id", gameId)
    .single();

  if (!game || game.current_player_id !== userId) {
    return NextResponse.json({ error: "Not your turn" }, { status: 400 });
  }

  // Add word to game
  const { data: gameWord, error: wordError } = await supabase
    .from("game_words")
    .insert({
      game_id: gameId,
      user_id: userId,
      word: word.toLowerCase(),
      word_order: (game.words_used?.length || 0) + 1,
      points_earned: score,
      time_taken: timeTaken,
    })
    .select()
    .single();

  if (wordError) {
    return NextResponse.json({ error: "Failed to add word" }, { status: 500 });
  }

  // Update participant score
  await supabase
    .from("game_participants")
    .update({
      score: supabase.raw("score + ?", [score]),
      words_played: supabase.raw("words_played + 1"),
    })
    .eq("game_id", gameId)
    .eq("user_id", userId);

  // Find next player
  const currentPlayerIndex = game.participants.findIndex(
    (p: GameParticipant) => p.user_id === userId,
  );
  const nextPlayerIndex = (currentPlayerIndex + 1) % game.participants.length;
  const nextPlayer = game.participants[nextPlayerIndex];

  // Update game state
  const updatedWordsUsed = [...(game.words_used || []), word.toLowerCase()];

  await supabase
    .from("games")
    .update({
      current_word: word.toLowerCase(),
      current_player_id: nextPlayer.user_id,
      words_used: updatedWordsUsed,
      final_chain_length: updatedWordsUsed.length,
    })
    .eq("id", gameId);

  return NextResponse.json({
    success: true,
    word: gameWord,
    score,
    nextPlayerId: nextPlayer.user_id,
  });
}

async function handleSkipTurn(gameId: string, userId: string) {
  if (!supabase) throw new Error("Database not available");

  // Get current game state
  const { data: game } = await supabase
    .from("games")
    .select("*, participants:game_participants(*)")
    .eq("id", gameId)
    .single();

  if (!game || game.current_player_id !== userId) {
    return NextResponse.json({ error: "Not your turn" }, { status: 400 });
  }

  // Apply skip penalty
  await supabase
    .from("game_participants")
    .update({
      score: supabase.raw("GREATEST(0, score - 5)"),
    })
    .eq("game_id", gameId)
    .eq("user_id", userId);

  // Find next player
  const currentPlayerIndex = game.participants.findIndex(
    (p: GameParticipant) => p.user_id === userId,
  );
  const nextPlayerIndex = (currentPlayerIndex + 1) % game.participants.length;
  const nextPlayer = game.participants[nextPlayerIndex];

  // Update current player
  await supabase
    .from("games")
    .update({
      current_player_id: nextPlayer.user_id,
    })
    .eq("id", gameId);

  return NextResponse.json({
    success: true,
    penalty: -5,
    nextPlayerId: nextPlayer.user_id,
  });
}

async function handleEndGame(gameId: string) {
  if (!supabase) throw new Error("Database not available");

  // Get final game state
  const { data: game } = await supabase
    .from("games")
    .select("*, participants:game_participants(*)")
    .eq("id", gameId)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Find winner (highest score)
  const winner = game.participants.reduce(
    (prev: GameParticipant, current: GameParticipant) =>
      current.score > prev.score ? current : prev,
  );

  // Update game status
  await supabase
    .from("games")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  // Mark winner
  await supabase
    .from("game_participants")
    .update({ is_winner: true })
    .eq("game_id", gameId)
    .eq("user_id", winner.user_id);

  // Update user stats for all participants
  for (const participant of game.participants) {
    const xpGained = WordChainUtils.calculateXPGain(
      participant.words_played,
      participant.user_id === winner.user_id,
    );

    await supabase.rpc("update_user_stats", {
      p_user_id: participant.user_id,
      p_xp_gained: xpGained,
      p_game_won: participant.user_id === winner.user_id,
      p_words_played: participant.words_played,
    });
  }

  return NextResponse.json({
    success: true,
    winner: winner,
    finalScores: game.participants.map((p: GameParticipant) => ({
      userId: p.user_id,
      score: p.score,
      wordsPlayed: p.words_played,
      isWinner: p.user_id === winner.user_id,
    })),
  });
}
