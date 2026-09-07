import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Continuous Uber/Ola/Rapido-style alert: a looping ringtone plus a
// repeated haptic pulse, both starting the instant a new job offer appears
// and running until the staff member actually acts on it (accept/decline)
// or it's dismissed - never a single one-shot ding that's easy to miss
// while the phone is in a pocket or the screen is off.
//
// REPLACE ../assets/sounds/new-offer.wav with a real alert tone before
// shipping - this ships with a plain generated two-tone beep as a working
// placeholder so the feature is fully wired and testable today.
const ALERT_SOUND = require('../../assets/sounds/new-offer.wav');

let audioModeConfigured = false;
async function ensureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
  } catch {
    // Non-fatal - the alert still attempts to play at default volume/mode.
  }
}

const HAPTIC_PULSE_MS = 1200;

/**
 * Call with `active: true` for as long as an offer should keep alerting
 * (i.e. count > 0 and not yet acknowledged). Stops itself automatically
 * the moment `active` goes false or the component unmounts - never leaves
 * a ringtone looping in the background after the offer is gone.
 */
export function useOfferAlertSound(active: boolean) {
  const player = useAudioPlayer(ALERT_SOUND);
  const hapticInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void ensureAudioMode();
  }, []);

  useEffect(() => {
    if (!active) {
      player.pause();
      if (hapticInterval.current) {
        clearInterval(hapticInterval.current);
        hapticInterval.current = null;
      }
      return;
    }

    player.loop = true;
    player.volume = 1.0;
    try {
      player.seekTo(0);
    } catch {
      // Non-fatal if the player isn't loaded yet - play() below still fires.
    }
    player.play();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    hapticInterval.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, HAPTIC_PULSE_MS);

    return () => {
      player.pause();
      if (hapticInterval.current) {
        clearInterval(hapticInterval.current);
        hapticInterval.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Stop alerting the instant the app is backgrounded - the OS push
  // notification (already wired, see usePushRegistration.ts) is the correct
  // channel once the user isn't looking at the screen; a looping in-app
  // sound with no UI to silence it would otherwise keep playing muted in
  // the background on some Android OEMs.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        player.pause();
      } else if (active) {
        player.play();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
