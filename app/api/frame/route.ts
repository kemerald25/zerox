/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    // Get the original URL with query params from the request
    const url = new URL(req.url);
    const data = url.searchParams.get('data');
    
    // If we have share data, redirect to the share page
    if (data) {
      return NextResponse.redirect(`${baseUrl}/share?data=${data}`, 302);
    }
    
    // Otherwise redirect to home
    return NextResponse.redirect(baseUrl, 302);
  } catch (error) {
    console.error('Frame API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}