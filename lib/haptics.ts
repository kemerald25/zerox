import { sdk } from '@farcaster/miniapp-sdk';

function hasHaptics(): boolean {
  try {
    const features = (sdk as any)?.context?.features;
    return Boolean(features?.haptics || (sdk as any)?.haptics);
  } catch {
    return false;
  }
}

export async function hapticTap(): Promise<void> {
  try {
    if ((sdk as any)?.haptics?.impactOccurred) {
      await (sdk as any).haptics.impactOccurred('light');
    }
  } catch {}
}

export async function hapticWin(): Promise<void> {
  try {
    if ((sdk as any)?.haptics?.notificationOccurred) {
      await (sdk as any).haptics.notificationOccurred('success');
    } else if ((sdk as any)?.haptics?.impactOccurred) {
      await (sdk as any).haptics.impactOccurred('medium');
    }
  } catch {}
}

export async function hapticLoss(): Promise<void> {
  try {
    if ((sdk as any)?.haptics?.notificationOccurred) {
      await (sdk as any).haptics.notificationOccurred('error');
    } else if ((sdk as any)?.haptics?.impactOccurred) {
      await (sdk as any).haptics.impactOccurred('light');
    }
  } catch {}
}

export { hasHaptics };


