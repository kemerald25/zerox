import {
  setUserNotificationDetails,
  deleteUserNotificationDetails,
} from "@/lib/notification";
import { sendFrameNotification } from "@/lib/notification-client";
import { http } from "viem";
import { createPublicClient } from "viem";
import { optimism } from "viem/chains";

const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME;

const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

const KEY_REGISTRY_ABI = [
  {
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    name: "keyDataOf",
    outputs: [
      {
        components: [
          { name: "state", type: "uint8" },
          { name: "keyType", type: "uint32" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifyFidOwnership(fid: number, appKey: `0x${string}`) {
  const client = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  try {
    const result = await client.readContract({
      address: KEY_REGISTRY_ADDRESS,
      abi: KEY_REGISTRY_ABI,
      functionName: "keyDataOf",
      args: [BigInt(fid), appKey],
    });

    return result.state === 1 && result.keyType === 1;
  } catch (error) {
    console.error("Key Registry verification failed:", error);
    return false;
  }
}

function decode(encoded: string) {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
}

export async function POST(request: Request) {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Request received at:', new Date().toISOString());
  
  try {
    const requestJson = await request.json();
    console.log('Webhook payload:', JSON.stringify(requestJson, null, 2));

    // Check if this is a test request
    if (requestJson.test) {
      console.log('Test request received, returning success');
      return Response.json({ success: true, message: 'Test webhook working' });
    }

    // Validate required fields for Farcaster webhook
    if (!requestJson.header || !requestJson.payload) {
      console.log('Missing header or payload in webhook request');
      return Response.json({ 
        success: false, 
        error: "Missing header or payload" 
      }, { status: 400 });
    }

    const { header: encodedHeader, payload: encodedPayload } = requestJson;

    let headerData, event;
    try {
      headerData = decode(encodedHeader);
      event = decode(encodedPayload);
      console.log('Decoded header:', headerData);
      console.log('Decoded event:', event);
    } catch (decodeError) {
      console.error('Failed to decode header or payload:', decodeError);
      return Response.json({ 
        success: false, 
        error: "Failed to decode header or payload" 
      }, { status: 400 });
    }

    if (!headerData.fid || !headerData.key) {
      console.log('Missing FID or key in header data');
      return Response.json({ 
        success: false, 
        error: "Missing FID or key in header" 
      }, { status: 400 });
    }

    const { fid, key } = headerData;

    const valid = await verifyFidOwnership(fid, key);
    console.log('FID ownership verification result:', valid);

    if (!valid) {
      console.log('FID ownership verification failed');
      return Response.json(
        { success: false, error: "Invalid FID ownership" },
        { status: 401 },
      );
    }

    // Try to extract address from the event if available
    const address = event.address || null;
    console.log('Extracted address:', address);

    switch (event.event) {
      case "miniapp_added":
        console.log(
          "miniapp_added event received",
          "event.notificationDetails",
          event.notificationDetails,
        );
        if (event.notificationDetails) {
          console.log('Saving notification details for FID:', fid);
          console.log('Token:', event.notificationDetails.token);
          console.log('URL:', event.notificationDetails.url);
          
          await setUserNotificationDetails(fid, event.notificationDetails, address);
          console.log('Notification details saved successfully');
          
          console.log('Sending welcome notification');
          await sendFrameNotification({
            fid,
            title: `Welcome to ${appName}`,
            body: `Thank you for adding ${appName}`,
          });
          console.log('Welcome notification sent');
        } else {
          console.log('No notification details in event, deleting user');
          await deleteUserNotificationDetails(fid);
        }

        break;
      case "miniapp_removed": {
        console.log("miniapp_removed event received");
        await deleteUserNotificationDetails(fid);
        break;
      }
      case "notifications_enabled": {
        console.log("notifications_enabled event received", event.notificationDetails);
        if (event.notificationDetails) {
          console.log('Saving notification details for FID:', fid);
          console.log('Token:', event.notificationDetails.token);
          console.log('URL:', event.notificationDetails.url);
          
          await setUserNotificationDetails(fid, event.notificationDetails, address);
          console.log('Notification details saved successfully');
          
          await sendFrameNotification({
            fid,
            title: `Welcome to ${appName}`,
            body: `Thank you for enabling notifications for ${appName}`,
          });
          console.log('Welcome notification sent');
        }
        break;
      }
      case "notifications_disabled": {
        console.log("notifications_disabled event received");
        await deleteUserNotificationDetails(fid);
        break;
      }
      default:
        console.log('Unknown event type:', event.event);
    }

    console.log('Webhook processed successfully');
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
