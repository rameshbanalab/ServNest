import React, { useState, useCallback, useEffect } from "react";
import { LeafletView } from "react-native-leaflet-view";
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../config/firebaseConfig";
import { collection, getDocs, query } from "firebase/firestore";

const { width } = Dimensions.get("window");
const DEFAULT_LOCATION = { latitude: 16.9716, longitude: 78.5946 };

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
        id: doc.id, // Add document ID for unique marker identification
        name: doc.data().businessName,
        location: doc.data().location
      }));
      
      setLocations(businessLocations);
      
      // Convert business locations to marker format
      const markers = businessLocations.map((business, index) => ({
        id: `business-${business.id}`, // Unique ID for each marker
        position: {
          lat: business.location.latitude,
          lng: business.location.longitude
        },
        // icon: "📍", // You can use emoji or custom icon URL
        icon:"https://cdn-icons-png.flaticon.com/64/2776/2776067.png",
        size: [40, 40],
        title: business.name, // Optional: for popup/tooltip
      }));
      
      setBusinessMarkers(markers);
      setLoading(false);
    } catch (error) {
      console.log("Error in fetching business locations ", error);
      setLoading(false);
    }
  };

//   const onMessageReceived = useCallback(({ event, payload }) => {
//     if (event === "onMapClicked") {
//       const { lat, lng } = payload.touchLatLng;
//       setClickedMarker({
//         id: "clicked-location",
//         position: { lat, lng },
//         icon: "🔴", // Different icon for clicked locations
//         size: [25, 25],
//       });
//     }
    
//     // Handle marker clicks if needed
//     if (event === "onMarkerClicked") {
//       console.log("Marker clicked:", payload);
//       // You can show additional info about the business here
//     }
//   }, []);

  useEffect(() => {
    fetchLocations();
  }, []);

  // Combine business markers with clicked marker
 

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading business locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Map View ({businessMarkers.length} Businesses)
        </Text>
      </View>

      <LeafletView
        style={styles.map}
        mapCenterPosition={{
          lat: DEFAULT_LOCATION.latitude,
          lng: DEFAULT_LOCATION.longitude,
        }}
        zoom={7}
        mapMarkers={businessMarkers}
        // onMessageReceived={onMessageReceived}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    height: 56,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: StatusBar.currentHeight || 0,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 24,
    color: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  map: {
    flex: 1,
    width,
  },
});
