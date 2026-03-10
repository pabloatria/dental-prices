import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
      android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
      default: '',
    }) ?? '';

export default function AdBanner() {
  const [adError, setAdError] = useState(false);

  if (Platform.OS === 'web' || adError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('AdBanner failed to load:', error.message);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
