import { NextRequest, NextResponse } from 'next/server';
import { sendBulkNotification } from '@/lib/notification-client';
import { getAllActiveNotificationTokens } from '@/lib/notification';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Check what's in the user_notifications table
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*');

    if (error) {
      console.error('Failed to fetch user notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });

  } catch (error) {
    console.error('Failed to fetch user notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: message, targetUrl, notificationId } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    console.log('Sending bulk notification:', { title, message, targetUrl, notificationId });

    // Debug: Check how many notification tokens we have
    const availableTokens = await getAllActiveNotificationTokens();
    console.log(`Found ${availableTokens.length} active notification tokens`);

    if (availableTokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active notification tokens found. Users may need to re-add the Mini App or enable notifications.',
        result: {
          totalSent: 0,
          totalFailed: 0,
          rateLimitedTokens: [],
          availableTokens: 0
        }
      });
    }

    // Send the notification to all users
    const result = await sendBulkNotification({
      title,
      body: message,
      targetUrl,
      notificationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Bulk notification sent',
      result: {
        ...result,
        availableTokens: availableTokens.length
      },
    });

  } catch (error) {
    console.error('Failed to send bulk notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// Test endpoint to manually add notification tokens (for debugging)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add-test-data') {
      if (!supabase) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }

      // Add some test notification tokens
      const testData = [
        {
          address: '0x1234567890123456789012345678901234567890',
          fid: 12345,
          notification_token: '550e8400-e29b-41d4-a716-446655440001', // Proper UUID format
          notification_url: 'https://api.farcaster.xyz/v1/frame-notifications',
          is_active: true
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          fid: 12346,
          notification_token: '550e8400-e29b-41d4-a716-446655440002', // Proper UUID format
          notification_url: 'https://api.farcaster.xyz/v1/frame-notifications',
          is_active: true
        }
      ];

      const { data, error } = await supabase
        .from('user_notifications')
        .upsert(testData, { onConflict: 'address,fid' });

      if (error) {
        console.error('Failed to add test data:', error);
        return NextResponse.json({ error: 'Failed to add test data' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test data added',
        data
      });
    }

    if (action === 'add-real-token') {
      if (!supabase) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }

      console.log('Adding real token with data:', body);

      // Add a real notification token for testing
      const realTokenData = {
        address: body.address || '0x1234567890123456789012345678901234567890',
        fid: body.fid || 12345,
        notification_token: body.token || '550e8400-e29b-41d4-a716-446655440000', // Proper UUID format
        notification_url: body.url || 'https://api.farcaster.xyz/v1/frame-notifications',
        is_active: true
      };

      console.log('Token data to insert:', realTokenData);

      const { data, error } = await supabase
        .from('user_notifications')
        .upsert(realTokenData, { onConflict: 'address,fid' });

      if (error) {
        console.error('Supabase error details:', error);
        return NextResponse.json({ 
          error: 'Failed to add real token', 
          details: error.message,
          code: error.code 
        }, { status: 500 });
      }

      console.log('Token added successfully:', data);

      return NextResponse.json({
        success: true,
        message: 'Real token added',
        data
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to add test data:', error);
    return NextResponse.json({ error: 'Failed to add test data' }, { status: 500 });
  }
}
