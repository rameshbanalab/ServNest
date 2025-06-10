import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where} from 'firebase/firestore';

const DonationDetails = ({route, navigation}) => {
  const {id, name, count} = route.params;
  //   console.log(typeof id)
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [payments, setPayments] = useState([]); // Assuming payments is an array of payment objects
  useEffect(() => {
    loadDonations();
  }, []);

  function formatTimeFromNanoseconds(seconds, nanoseconds) {
    // Convert nanoseconds to milliseconds
    const totalMilliseconds = seconds * 1000 + nanoseconds / 1e6;
    const date = new Date(totalMilliseconds);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const day = String(date.getDate()).padStart(2, '0');
    const month = monthNames[date.getMonth()]; // Get month name
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    return {
      date: formattedDate,
      time: formattedTime,
    };
  }

  // Initialize Firestore
  const loadDonations = async () => {
    setLoading(true);
    try {
      const paymentsRef = collection(db, 'DonationPayments');
      const q = query(paymentsRef, where('refId', '==', id));
      const querySnapshot = await getDocs(q);

      let paymentData = [];
      let total = 0;

      querySnapshot.forEach(doc => {
        const data = doc.data();
        let paymentDate = '';
        let paymentTime = '';
        if (data.createdAt) {
          const dateObj = formatTimeFromNanoseconds(
            data.createdAt.seconds,
            data.createdAt.nanoseconds,
          );
          // console.log(dateObj);
          paymentDate = dateObj.date;
          paymentTime = dateObj.time;
        }
        paymentData.push({
          id: doc.id,
          payerName: data.fullName,
          email: data.email,
          amount: data.amount || 0,
          paymentDate: paymentDate,
          transactionId: data.transactionId,
          paymentTime: paymentTime,
        });

        total += data.amount || 0; // Accumulate total amount
      });
      // console.log(paymentData)
      setPayments(paymentData);
      setTotalAmount(total);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donation payments:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonations();
    setRefreshing(false);
  };

  const formatAmount = amount => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const renderDonationCard = ({item}) => (
    <TouchableOpacity style={styles.donationCard} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.payerInfo}>
            <Text style={styles.payerName}>{item.payerName}</Text>
            <Text style={styles.payerEmail}>{item.email}</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentDate}>
              {item.paymentDate} | {item.paymentTime}
            </Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.amount}>
            ₹{item.amount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.transactionId}>ID: {item.transactionId}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>{count} donations</Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{count}</Text>
          <Text style={styles.statLabel}>Total Donations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatAmount(totalAmount)}</Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Donations</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No donations found</Text>
      <Text style={styles.emptyStateSubtext}>
        Donations for this category will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text style={styles.loadingText}>Loading donations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderDonationCard}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#8BC34A',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#EEEEEE',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8BC34A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  leftSection: {
    flex: 1,
    marginRight: 16,
  },
  payerInfo: {
    marginBottom: 8,
  },
  payerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  payerEmail: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  paymentInfo: {
    gap: 2,
  },
  paymentDate: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  transactionId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8BC34A',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#C5E1A5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#689F38',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DonationDetails;
