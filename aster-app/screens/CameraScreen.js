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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

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

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.cancelled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setImage(uri);
      navigation.navigate('PhotoConfirmation', { image: uri });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.cancelled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setImage(uri);
      navigation.navigate('PhotoConfirmation', { image: uri });
    }
  };

  const handleWebInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      setImage(uri);
      navigation.navigate('PhotoConfirmation', { image: uri });
    }
  };

  const handleMealTypeSelect = (mealType) => {
    setShowMealSelector(false);
    if (mode === 'Manual') {
      navigation.navigate('AddFoodScreen', { mealType });
    } else {
      // Camera mode - take photo
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
            <Text style={styles.manualText}>Manual Food Entry</Text>
            <Text style={styles.manualSubtext}>Enter food details manually</Text>
          </View>
        )}

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <View style={styles.modeIndicators}>
            <View style={styles.modeDot}>
              <Text style={styles.modeDotText}>1</Text>
            </View>
            <View style={styles.modeDot}>
              <Text style={styles.modeDotText}>2</Text>
            </View>
            <View style={styles.modeDot}>
              <Text style={styles.modeDotText}>5</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.shutterButton} onPress={handleAddButton}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          
          <View style={styles.modeLabels}>
            <Text style={[styles.modeLabel, mode === 'Camera' && styles.activeModeLabel]}>
              Camera
            </Text>
            <Text style={[styles.modeLabel, mode === 'Manual' && styles.activeModeLabel]}>
              Manual
            </Text>
          </View>
        </View>
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
  manualText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  manualSubtext: {
    fontSize: 16,
    color: '#666',
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
    marginBottom: 20,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  modeLabels: {
    flexDirection: 'row',
    gap: 20,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeModeLabel: {
    color: '#333',
    fontWeight: '600',
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
