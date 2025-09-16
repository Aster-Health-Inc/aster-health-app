import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed');

const CameraScreen = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [mode, setMode] = useState('Camera');
  const [showMealSelector, setShowMealSelector] = useState(false);

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Camera permission is required!');
        }
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      document.getElementById('webcamInput').click();
      return;
    }

    try {
      console.log('Requesting camera permissions...');
      
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission result:', permissionResult);
      
      if (permissionResult.status !== 'granted') {
        alert('Camera permission is required to take photos');
        return;
      }

      console.log('Launching camera...');
      
      // Add timeout for camera launch
      const cameraPromise = ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
        exif: false, // Reduce data size
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Camera timeout - try gallery instead')), 10000)
      );
      
      const result = await Promise.race([cameraPromise, timeoutPromise]);
      console.log('Camera result:', result);

      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        const base64 = result.assets[0].base64;
        console.log('Photo taken successfully, navigating...');
        setImage(uri);
        navigation.navigate('PhotoConfirmation', { image: uri, base64: base64 });
      } else if (result.canceled) {
        console.log('Camera was canceled');
      } else {
        console.log('No image assets found');
        alert('No photo was captured');
      }
    } catch (error) {
      console.error('Camera error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      
      // Offer gallery as fallback
      const useGallery = confirm(`Camera failed: ${error.message}\n\nWould you like to select from gallery instead?`);
      if (useGallery) {
        pickFromGallery();
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = result.assets[0].base64;
      setImage(uri);
      navigation.navigate('PhotoConfirmation', { image: uri, base64: base64 });
    }
  };

  const handleWebInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      
      // Convert file to base64 for web
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.replace('data:', '').replace(/^.+,/, '');
        setImage(uri);
        navigation.navigate('PhotoConfirmation', { image: uri, base64: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMealTypeSelect = (mealType) => {
    setShowMealSelector(false);
    if (mode === 'Manual') {
      navigation.navigate('AddFoodScreen', { mealType });
    } else {
      // Camera mode - take photo or select from gallery
      showPhotoOptions();
    }
  };

  const showPhotoOptions = () => {
    // Show options for camera or gallery
    if (Platform.OS === 'ios') {
      // On iOS, show action sheet
      const options = ['Camera', 'Photo Library', 'Cancel'];
      // For now, just try gallery first since camera might not work on simulator
      pickFromGallery();
    } else {
      takePhoto();
    }
  };

  const handleAddButton = () => {
    setShowMealSelector(true);
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'Manual' && styles.activeToggle]}
            onPress={() => setMode('Manual')}
          >
            <Text style={[styles.toggleText, mode === 'Manual' && styles.activeText]}>
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'Camera' && styles.activeToggle]}
            onPress={() => setMode('Camera')}
          >
            <Text style={[styles.toggleText, mode === 'Camera' && styles.activeText]}>
              Camera
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {mode === 'Camera' ? (
          <View style={styles.cameraView}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' }} 
              style={styles.cameraPreview} 
            />
          </View>
        ) : (
          <View style={styles.manualView}>
            <Ionicons name="restaurant-outline" size={80} color="#ccc" style={styles.manualIcon} />
            <Text style={styles.manualText}>Manual Food Entry</Text>
            <Text style={styles.manualSubtext}>Enter food details manually</Text>
            <TouchableOpacity 
              style={styles.addFoodButton} 
              onPress={() => setShowMealSelector(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FF6B9D" />
              <Text style={styles.addFoodButtonText}>Add Food</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Camera Controls */}
      <View style={styles.cameraControls}>
        {mode === 'Camera' ? (
          <>
            <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
              <Text style={styles.galleryButtonText}>📷 Gallery</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.manualAddButton} 
            onPress={() => setShowMealSelector(true)}
          >
            <Text style={styles.manualAddButtonText}>Add Food Manually</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          id="webcamInput"
          type="file"
          accept="image/*"
          onChange={handleWebInputChange}
          style={{ display: 'none' }}
        />
      )}

      {/* Meal Type Selector Modal */}
      <Modal
        visible={showMealSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMealSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mealSelectorModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMealSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Meal Type</Text>
              <TouchableOpacity>
                <Ionicons name="arrow-up" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.mealOptions}>
              {mealTypes.map((mealType) => (
                <TouchableOpacity
                  key={mealType}
                  style={styles.mealOption}
                  onPress={() => handleMealTypeSelect(mealType)}
                >
                  <Text style={styles.mealOptionText}>{mealType}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeToggle: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeText: {
    color: '#333',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  cameraView: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  manualView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  manualIcon: {
    marginBottom: 20,
  },
  manualText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  manualSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addFoodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
    marginLeft: 8,
  },
  manualAddButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 50,
  },
  manualAddButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraControls: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modeIndicators: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  modeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 50,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  galleryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 50,
  },
  galleryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealSelectorModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mealOptions: {
    gap: 12,
  },
  mealOption: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  mealOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

});
