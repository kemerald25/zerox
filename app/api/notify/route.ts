import { NextRequest, NextResponse } from 'next/server';
import { sendBulkNotification } from '@/lib/notification-client';

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

    // Optional: Add authentication/authorization here
    // For now, anyone can send notifications (you might want to restrict this)

    console.log('Sending bulk notification:', { title, message, targetUrl, notificationId });

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
      result,
    });

  } catch (error) {
    console.error('Failed to send bulk notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
