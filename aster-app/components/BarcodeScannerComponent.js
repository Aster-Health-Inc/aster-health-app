import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import camera dependencies with fallback
let Camera;
try {
  const ExpoCamera = require('expo-camera');
  Camera = ExpoCamera.Camera || ExpoCamera.CameraView;
} catch (error) {
  console.log('Camera dependencies not available');
  Camera = null;
}

const { width, height } = Dimensions.get('window');

const BarcodeScannerComponent = ({ onBarcodeScanned, onClose, isActive = true }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (!Camera) {
      setHasPermission(false);
      return;
    }

    const getCameraPermissions = async () => {
      try {
        // First check current permission status
        const currentStatus = await Camera.getCameraPermissionsAsync();
        console.log('Current camera permission status:', currentStatus);
        
        if (currentStatus.status === 'granted') {
          setHasPermission(true);
          return;
        }
        
        // If not granted, request permission
        console.log('Requesting camera permissions...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Permission request result:', status);
        
        setHasPermission(status === 'granted');
        
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        setHasPermission(false);
      }
    };
    
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned || !isActive) return;
    
    setScanned(true);
    console.log('Barcode scanned:', { type, data });
    
    // Vibrate on successful scan (if available)
    Vibration.vibrate(200);
    
    onBarcodeScanned(data, type);
    
    // Reset after 2 seconds to allow new scans
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Text style={styles.message}>Requesting camera permission...</Text>
          <Text style={styles.subMessage}>
            Please allow camera access to scan barcodes
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false || !Camera) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Text style={styles.errorTitle}>Camera Not Available</Text>
          <Text style={styles.errorMessage}>
            {!Camera 
              ? 'Camera functionality is not available on this device.'
              : 'Camera permission is required to scan barcodes. Please enable camera access in your device settings and try again.'
            }
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        facing="back"
        flash={flashOn ? "on" : "off"}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top section */}
          <View style={styles.topOverlay}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.flashBtn} onPress={toggleFlash}>
              <Ionicons 
                name={flashOn ? "flash" : "flash-off"} 
                size={30} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {/* Scanning area */}
          <View style={styles.scanningArea}>
            <View style={styles.scanFrame}>
              {/* Corner indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scanning line animation */}
              {!scanned && (
                <View style={styles.scanLine} />
              )}
            </View>
          </View>

          {/* Bottom section */}
          <View style={styles.bottomOverlay}>
            <Text style={styles.instructionText}>
              {scanned ? 'Processing barcode...' : 'Position barcode within the frame'}
            </Text>
            <Text style={styles.subInstructionText}>
              {scanned ? 'Please wait' : 'Ensure good lighting for best results'}
            </Text>
            
            {scanned && (
              <View style={styles.processingIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.processingText}>Barcode detected!</Text>
              </View>
            )}
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  subMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  closeButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  flashBtn: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  scanningArea: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ff00',
    top: '50%',
    shadowColor: '#00ff00',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  bottomOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingBottom: 50,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 20,
  },
  processingText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BarcodeScannerComponent;
