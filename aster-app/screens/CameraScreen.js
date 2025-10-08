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
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const CameraScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const selectedDate = route.params?.selectedDate || new Date();

  const [hasPermission, setHasPermission] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(false);

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        setHasPermission(true);
        return;
      }

      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setHasPermission(false);
          Alert.alert(
            'Camera permission needed',
            'Please enable camera access in Settings to take meal photos.'
          );
        } else {
          setHasPermission(true);
        }
      } catch (err) {
        console.error('Camera permission error:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      document.getElementById('webcamInput').click();
      return;
    }

    if (hasPermission !== true) {
      Alert.alert('Camera unavailable', 'Please enable camera access to take a photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        navigation.navigate('PhotoConfirmation', {
          image: asset.uri,
          base64: asset.base64,
          selectedDate,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('Failed to take photo. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const { uri, base64 } = result.assets[0];
      navigation.navigate('PhotoConfirmation', {
        image: uri,
        base64: base64,
        selectedDate: selectedDate
      });
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
        navigation.navigate('PhotoConfirmation', {
          image: uri,
          base64: base64,
          selectedDate: selectedDate
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualEntry = () => {
    setShowMealSelector(true);
  };

  const handleMealTypeSelect = (mealType) => {
    setShowMealSelector(false);
    navigation.navigate('AddFoodScreen', {
      mealType,
      selectedDate: selectedDate
    });
  };



  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Background */}
      {Platform.OS !== 'web' ? (
        <View style={styles.camera}>
          <View style={styles.cameraBackdrop}>
            <MaterialCommunityIcons name="food-apple" size={96} color="rgba(255,255,255,0.82)" />
            <Text style={styles.backdropText}>Point at your meal and snap a photo</Text>
          </View>
          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleManualEntry}
              >
                <View style={[styles.iconContainer, styles.manualIconBg]}>
                  <Ionicons name="create-outline" size={32} color="#2F7D78" />
                </View>
                <Text style={styles.actionButtonText}>Manual Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={takePhoto}
              >
                <View style={[styles.iconContainer, styles.cameraIconBg]}>
                  <Ionicons name="camera-outline" size={32} color="#FF6B9D" />
                </View>
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.webContainer}>
          <View style={styles.webPlaceholder}>
            <Ionicons name="camera-outline" size={80} color="#ccc" />
            <Text style={styles.webText}>Camera not available on web</Text>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleManualEntry}
            >
              <View style={[styles.iconContainer, styles.manualIconBg]}>
                <Ionicons name="create-outline" size={32} color="#2F7D78" />
              </View>
              <Text style={styles.actionButtonText}>Manual Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickFromGallery}
            >
              <View style={[styles.iconContainer, styles.cameraIconBg]}>
                <Ionicons name="images-outline" size={32} color="#FF6B9D" />
              </View>
              <Text style={styles.actionButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        animationType="slide"
        onRequestClose={() => setShowMealSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mealSelectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meal Type</Text>
              <TouchableOpacity onPress={() => setShowMealSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
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
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101820',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
  },
  noPermissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    position: 'relative',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0F1C1E',
  },
  cameraBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  backdropText: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  manualIconBg: {
    backgroundColor: 'rgba(47, 125, 120, 0.12)',
  },
  cameraIconBg: {
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    justifyContent: 'space-between',
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    fontSize: 16,
    color: '#8C8C8C',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mealSelectorModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  mealOptions: {
    gap: 12,
  },
  mealOption: {
    backgroundColor: '#F4F5F7',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  mealOptionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
});
