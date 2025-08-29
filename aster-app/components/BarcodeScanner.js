import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BarcodeScanner = ({ onBarcodeScanned, isActive = true }) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningProgress, setScanningProgress] = useState('');
  const [autoScanInterval, setAutoScanInterval] = useState(null);

  // Auto-start scanning when component becomes active
  useEffect(() => {
    if (isActive && !cameraActive) {
      // Automatically start camera scanning when component is active
      startCameraScanning();
    }
    
    // Cleanup interval on unmount or when inactive
    return () => {
      if (autoScanInterval) {
        clearInterval(autoScanInterval);
      }
    };
  }, [isActive]);

  // Cleanup interval when it changes
  useEffect(() => {
    return () => {
      if (autoScanInterval) {
        clearInterval(autoScanInterval);
      }
    };
  }, [autoScanInterval]);

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Enter Barcode', 'Please enter a barcode number');
      return;
    }
    
    console.log('Manual barcode entered:', manualBarcode);
    onBarcodeScanned(manualBarcode.trim(), 'manual');
    setManualBarcode('');
  };

  // Simulate automatic scanning with some example barcodes for demo
  const testBarcodes = [
    { code: '3017620422003', name: 'Nutella' },
    { code: '737628064502', name: 'Coca Cola' },
    { code: '8901030835403', name: 'Maggi Noodles' },
    { code: '7622210993403', name: 'Oreo Cookies' },
    { code: '5449000000996', name: 'Coca Cola Classic' },
  ];

  const handleTestBarcode = (barcode) => {
    onBarcodeScanned(barcode, 'test');
  };

  const startCameraScanning = async () => {
    try {
      // Request camera permissions first
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required to scan barcodes');
        return;
      }

      setCameraActive(true);
      setScanningProgress('Starting camera...');
      
      // Simulate camera startup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setScanningProgress('Looking for barcodes...');
      
      // Start automatic scanning simulation
      const interval = setInterval(async () => {
        setScanningProgress('Scanning...');
        
        // Simulate barcode detection attempt every 2 seconds
        const detectedBarcode = await simulateAutomaticDetection();
        
        if (detectedBarcode) {
          // Found a barcode!
          clearInterval(interval);
          setAutoScanInterval(null);
          setCameraActive(false);
          setScanningProgress('Barcode detected!');
          
          setTimeout(() => {
            onBarcodeScanned(detectedBarcode, 'camera');
          }, 500);
        } else {
          setScanningProgress('Keep camera steady...');
        }
      }, 2000);
      
      setAutoScanInterval(interval);
      
    } catch (error) {
      console.error('Camera scan error:', error);
      Alert.alert('Scan Error', 'Failed to start camera scanning.');
      setCameraActive(false);
    }
  };

  const stopCameraScanning = () => {
    if (autoScanInterval) {
      clearInterval(autoScanInterval);
      setAutoScanInterval(null);
    }
    setCameraActive(false);
    setScanningProgress('');
  };

  // Simulate automatic barcode detection
  const simulateAutomaticDetection = async () => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random chance of finding a barcode (40% chance to simulate real scanning difficulty)
    if (Math.random() > 0.6) {
      const testBarcodes = [
        '3017620422003', // Nutella
        '737628064502',  // Coca Cola
        '8901030835403', // Maggi Noodles
        '7622210993403', // Oreo Cookies
        '5449000000996', // Coca Cola Classic
      ];
      return testBarcodes[Math.floor(Math.random() * testBarcodes.length)];
    }
    
    return null; // No barcode detected this time
  };

  // Simulate barcode extraction from image
  // In a real app, you would use an OCR service like Google Vision API
  const simulateBarcodeExtraction = async (base64Image) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demonstration, randomly return one of the test barcodes
    // In a real implementation, this would analyze the image
    const testBarcodes = [
      '3017620422003', // Nutella
      '737628064502',  // Coca Cola
      '8901030835403', // Maggi Noodles
      '7622210993403', // Oreo Cookies
      '5449000000996', // Coca Cola Classic
    ];
    
    // Simulate 70% success rate
    if (Math.random() > 0.3) {
      return testBarcodes[Math.floor(Math.random() * testBarcodes.length)];
    }
    
    return null; // Simulate failed detection
  };

  return (
    <View style={styles.container}>
      {/* Live Camera Scanning View - Always active when component is mounted */}
      <View style={styles.liveCameraContainer}>
        <View style={styles.cameraView}>
          {/* Simulated camera feed background */}
          <View style={styles.cameraFeed}>
            {/* Scanning overlay */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanLine} />
            </View>
            
            {/* Corner brackets */}
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
            
            {/* Scanning status */}
            <View style={styles.scanStatus}>
              <ActivityIndicator size="small" color="#00ff00" />
              <Text style={styles.scanStatusText}>
                {scanningProgress || 'Initializing camera...'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsOverlay}>
          <Text style={styles.liveInstructionText}>Point camera at barcode</Text>
          <Text style={styles.liveSubInstructionText}>Barcode will be scanned automatically</Text>
        </View>
        
        {/* Quick test buttons overlay */}
        <View style={styles.quickTestOverlay}>
          <Text style={styles.quickTestTitle}>Or try these test products:</Text>
          <View style={styles.quickTestButtons}>
            {testBarcodes.slice(0, 3).map((item) => (
              <TouchableOpacity 
                key={item.code}
                style={styles.quickTestButton}
                onPress={() => handleTestBarcode(item.code)}
              >
                <Text style={styles.quickTestButtonText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  scanButton: {
    marginBottom: 30,
  },
  scanButtonDisabled: {
    opacity: 0.7,
  },
  scanArea: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
  },
  centerContent: {
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00ff00',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00ff00',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00ff00',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00ff00',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  subInstructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  manualEntry: {
    marginBottom: 20,
  },
  manualTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#00ff00',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  testSection: {
    flex: 1,
  },
  testTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  testButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  testButton: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#00ff00',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testButtonCode: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  
  // Live camera scanning styles
  liveCameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10,
  },
  cameraView: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraFeed: {
    flex: 1,
    backgroundColor: '#333',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanOverlay: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#00ff00',
    opacity: 0.8,
  },
  scanLine: {
    height: '100%',
    backgroundColor: '#00ff00',
    shadowColor: '#00ff00',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scanStatus: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  liveInstructionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  liveSubInstructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  quickTestOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 15,
    padding: 15,
  },
  quickTestTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  quickTestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickTestButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00ff00',
    flex: 1,
    marginHorizontal: 2,
  },
  quickTestButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BarcodeScanner;