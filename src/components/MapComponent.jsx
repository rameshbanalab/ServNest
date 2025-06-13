import React, {useState, useCallback, useEffect} from 'react';
import {LeafletView} from 'react-native-leaflet-view';

import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {db} from '../config/firebaseConfig';
import {collection, getDocs, query} from 'firebase/firestore';

const {width, height} = Dimensions.get('window');
const DEFAULT_LOCATION = {latitude: 17.43, longitude: 78.44};

export default function MapScreen() {
  const navigation = useNavigation();
  const [businessMarkers, setBusinessMarkers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      let Bquery = query(collection(db, 'Businesses'));
      const snapshot = await getDocs(Bquery);
      const businessLocations = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().businessName,
        location: doc.data().location,
      }));

      setLocations(businessLocations);

      const markers = businessLocations.map((business, index) => ({
        id: `business-${business.id}`,
        position: {
          lat: business.location.latitude,
          lng: business.location.longitude,
        },
        icon: 'https://cdn-icons-png.flaticon.com/64/7310/7310018.png',
        size: [50, 50],
        title: business.name,
      }));

      setBusinessMarkers(markers);
      setLoading(false);
    } catch (error) {
      console.log('Error in fetching business locations ', error);
      setLoading(false);
    }
  };

  const onMessageReceived = useCallback(({event, payload}) => {
    if (event === 'onMarkerClicked') {
      console.log('Business marker clicked:', payload);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <StatusBar backgroundColor="#D32F2F" barStyle="light-content" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text style={styles.loadingText}>Loading business locations...</Text>
          <Text style={styles.loadingSubText}>
            Please wait while we fetch data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#D32F2F" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Business Locations</Text>
          <Text style={styles.headerSubtitle}>
            {businessMarkers.length} businesses found
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.locationIndicator}>
            <Text style={styles.locationDot}>●</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <LeafletView
          style={styles.map}
          mapCenterPosition={{
            lat: DEFAULT_LOCATION.latitude,
            lng: DEFAULT_LOCATION.longitude,
          }}
          zoom={10}
          mapMarkers={businessMarkers}
          onMessageReceived={onMessageReceived}
        />

        <View style={styles.mapOverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayText}>
              📍 {businessMarkers.length} Active Locations
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    height: 80,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'center',
  },
  locationIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDot: {
    fontSize: 8,
    color: '#D32F2F',
  },
  mapContainer: {
    flex: 1,
    margin: 5,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  overlayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  overlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  bottomBar: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
});
