import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
      android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
      default: '',
    }) ?? '';

let interstitial: InterstitialAd | null = null;
let isLoaded = false;

function createAndLoadInterstitial(): void {
  if (Platform.OS === 'web') return;

  interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  const unsubscribeLoaded = interstitial.addAdEventListener(
    AdEventType.LOADED,
    () => {
      isLoaded = true;
    },
  );

  const unsubscribeClosed = interstitial.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      isLoaded = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      createAndLoadInterstitial();
    },
  );

  const unsubscribeError = interstitial.addAdEventListener(
    AdEventType.ERROR,
    (error) => {
      console.warn('Interstitial ad error:', error.message);
      isLoaded = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    },
  );

  interstitial.load();
}

/** Call once at app startup to pre-load the first interstitial */
export function initInterstitialAds(): void {
  createAndLoadInterstitial();
}

/** Show an interstitial ad if loaded. Returns true if shown. */
export function showInterstitial(): boolean {
  if (Platform.OS === 'web') return false;

  if (interstitial && isLoaded) {
    interstitial.show();
    return true;
  }

  if (!interstitial || !isLoaded) {
    createAndLoadInterstitial();
  }

  return false;
}
