import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const ConnectivityOverlay = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(Boolean(offline));
    });

    NetInfo.fetch().then((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(Boolean(offline));
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        /* noop */
      }
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const state = await NetInfo.fetch();
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(Boolean(offline));
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal
      visible={isOffline}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRetry}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="alert-circle" size={20} color="#533495" />
          <Text style={styles.noiseText}>Pshhht...pshhhhht-</Text>
          <Text style={styles.title}>Whoops!</Text>
          <Text style={styles.subtitle}>Lost connection :(</Text>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="wifi-off" size={54} color="#291350" />
          </View>
          <TouchableOpacity
            style={[styles.button, checking && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleRetry}
            disabled={checking}
          >
            <Text style={styles.buttonText}>{checking ? 'Checking...' : 'Try Again'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ConnectivityOverlay;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 0, 28, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#E7DDFB',
    borderRadius: 26,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#160633',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    gap: 10,
  },
  noiseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A1F78',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#210B42',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A1F78',
    marginBottom: 14,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  button: {
    marginTop: 6,
    backgroundColor: '#7A4BEB',
    borderRadius: 22,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
