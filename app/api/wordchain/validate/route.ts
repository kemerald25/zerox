/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Dictionary API integration (Merriam-Webster fallback to Wordnik)
const MERRIAM_WEBSTER_API_KEY = process.env.MERRIAM_WEBSTER_API_KEY;
const WORDNIK_API_KEY = process.env.WORDNIK_API_KEY;

async function checkMerriamWebster(word: string): Promise<boolean> {
  if (!MERRIAM_WEBSTER_API_KEY) return false;
  
  try {
    const response = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${MERRIAM_WEBSTER_API_KEY}`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 604800 } // Cache for 7 days
      }
    );
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0].meta;
  } catch {
    return false;
  }
}

async function checkWordnik(word: string): Promise<boolean> {
  if (!WORDNIK_API_KEY) return false;
  
  try {
    const response = await fetch(
      `https://api.wordnik.com/v4/word.json/${word}/definitions?limit=1&api_key=${WORDNIK_API_KEY}`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 604800 } // Cache for 7 days
      }
    );
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

async function checkLocalDictionary(word: string): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const { data, error } = await supabase
      .from('word_dictionary')
      .select('word')
      .eq('word', word.toLowerCase())
      .eq('is_valid', true)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

async function validateWordInDictionary(word: string): Promise<{
  valid: boolean;
  sources: string[];
  definition?: string;
}> {
  const cleanWord = word.toLowerCase().trim();
  const sources: string[] = [];
  
  // Check local dictionary first (fastest)
  const localValid = await checkLocalDictionary(cleanWord);
  if (localValid) sources.push('local');
  
  // Check external APIs
  const [merriamValid, wordnikValid] = await Promise.all([
    checkMerriamWebster(cleanWord),
    checkWordnik(cleanWord)
  ]);
  
  if (merriamValid) sources.push('merriam-webster');
  if (wordnikValid) sources.push('wordnik');
  
  // Require at least 2 sources for validation (or 1 if it's local)
  const valid = sources.length >= (localValid ? 1 : 2);
  
  // Cache valid words in local dictionary
  if (valid && !localValid && supabase) {
    try {
      await supabase
        .from('word_dictionary')
        .upsert({
          word: cleanWord,
          is_valid: true,
          usage_count: 1,
          difficulty_level: Math.min(3, Math.max(1, Math.floor(cleanWord.length / 3)))
        });
    } catch (error) {
      console.error('Failed to cache word:', error);
    }
  }
  
  return { valid, sources };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { word, gameId, userId } = body;
    
    if (!word || !gameId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: word, gameId, userId' },
        { status: 400 }
      );
    }
    
    const cleanWord = word.toLowerCase().trim();
    
    // Basic validation
    if (cleanWord.length < 3 || cleanWord.length > 15) {
      return NextResponse.json({
        valid: false,
        errors: ['Word must be between 3 and 15 characters'],
        word: cleanWord
      });
    }
    
    // Check for valid characters (letters only)
    if (!/^[a-z]+$/.test(cleanWord)) {
      return NextResponse.json({
        valid: false,
        errors: ['Word must contain only letters'],
        word: cleanWord
      });
    }
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }
    
    // Use the database function for comprehensive validation
    const { data: validationResult, error } = await supabase
      .rpc('validate_word_chain', {
        p_game_id: gameId,
        p_word: cleanWord,
        p_user_id: userId
      });
    
    if (error) {
      console.error('Validation error:', error);
      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 500 }
      );
    }
    
    // If basic validation passes, check dictionary
    if (validationResult.valid) {
      const dictionaryCheck = await validateWordInDictionary(cleanWord);
      
      if (!dictionaryCheck.valid) {
        return NextResponse.json({
          valid: false,
          errors: ['Word not found in dictionary'],
          word: cleanWord,
          sources: dictionaryCheck.sources
        });
      }
      
      return NextResponse.json({
        valid: true,
        word: cleanWord,
        sources: dictionaryCheck.sources,
        chainValid: validationResult.chain_valid,
        wordExists: validationResult.word_exists,
        wordUsed: validationResult.word_used
      });
    }
    
    // Return validation errors
    const errors = [];
    if (!validationResult.word_exists) {
      errors.push('Word not found in dictionary');
    }
    if (validationResult.word_used) {
      errors.push('Word already used in this game');
    }
    if (!validationResult.chain_valid) {
      errors.push(`Word must start with "${validationResult.expected_first_letter?.toUpperCase()}"`);
    }
    
    return NextResponse.json({
      valid: false,
      errors,
      word: cleanWord,
      expectedFirstLetter: validationResult.expected_first_letter
    });
    
  } catch (error) {
    console.error('Word validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for word definitions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get('word');
    
    if (!word) {
      return NextResponse.json(
        { error: 'Word parameter required' },
        { status: 400 }
      );
    }
    
    const cleanWord = word.toLowerCase().trim();
    
    // Try to get definition from Merriam-Webster
    if (MERRIAM_WEBSTER_API_KEY) {
      try {
        const response = await fetch(
          `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${cleanWord}?key=${MERRIAM_WEBSTER_API_KEY}`,
          { next: { revalidate: 604800 } }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].shortdef) {
            return NextResponse.json({
              word: cleanWord,
              definitions: data[0].shortdef,
              source: 'merriam-webster'
            });
          }
        }
      } catch (error) {
        console.error('Merriam-Webster API error:', error);
      }
    }
    
    // Fallback to Wordnik
    if (WORDNIK_API_KEY) {
      try {
        const response = await fetch(
          `https://api.wordnik.com/v4/word.json/${cleanWord}/definitions?limit=3&api_key=${WORDNIK_API_KEY}`,
          { next: { revalidate: 604800 } }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            return NextResponse.json({
              word: cleanWord,
              definitions: data.map((def: any) => def.text),
              source: 'wordnik'
            });
          }
        }
      } catch (error) {
        console.error('Wordnik API error:', error);
      }
    }
    
    return NextResponse.json({
      word: cleanWord,
      definitions: ['Definition not available'],
      source: 'none'
    });
    
  } catch (error) {
    console.error('Definition lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}