import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  StatusBar,
  TextInput,
  Image,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  startAfter,
  getCountFromServer,
  where
} from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const AdminBusinessAnalyticsScreen = ({ navigation }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for user and seller counts
  const [userCount, setUserCount] = useState(0);
  const [sellerCount, setSellerCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(true);
  
  // Lazy loading states
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [allBusinesses, setAllBusinesses] = useState([]);
  
  // Search states
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchBusinesses(true);
    fetchUserAndSellerCounts();
  }, []);

const fetchUserAndSellerCounts = async () => {
  try {
    setCountsLoading(true);
    
    // Use a simpler query approach
    const usersRef = collection(db, 'Users');
    const businessesRef = collection(db, 'Businesses');
    
    // Get user count using a different method
    const usersSnapshot = await getDocs(query(usersRef));
    setUserCount(usersSnapshot.size);
    
    // Get businesses and count unique sellers
    const businessesSnapshot = await getDocs(query(businessesRef));
    const uniqueSellerIds = new Set();
    
    businessesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        uniqueSellerIds.add(data.userId);
      }
    });
    
    setSellerCount(uniqueSellerIds.size);

  } catch (error) {
    console.error('Error fetching counts:', error);
    setUserCount(0);
    setSellerCount(0);
  } finally {
    setCountsLoading(false);
  }
};


  // Search functionality with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setShowSearchResults(false);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // ... (keep all existing functions like fetchBusinesses, performSearch, etc.)

  const fetchBusinesses = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setBusinesses([]);
        setLastDoc(null);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      let businessQuery = query(
        collection(db, 'Businesses'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      if (!isInitial && lastDoc) {
        businessQuery = query(
          collection(db, 'Businesses'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(ITEMS_PER_PAGE)
        );
      }

      const businessSnapshot = await getDocs(businessQuery);
      
      if (!businessSnapshot.empty) {
        const businessData = businessSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const newLastDoc = businessSnapshot.docs[businessSnapshot.docs.length - 1];
        setLastDoc(newLastDoc);

        if (isInitial) {
          setBusinesses(businessData);
          setAllBusinesses(businessData);
          calculateAnalytics(businessData);
        } else {
          const updatedBusinesses = [...businesses, ...businessData];
          setBusinesses(updatedBusinesses);
          setAllBusinesses(updatedBusinesses);
          calculateAnalytics(updatedBusinesses);
        }

        if (businessData.length < ITEMS_PER_PAGE) {
          setHasMoreData(false);
        }
      } else {
        if (isInitial) {
          setBusinesses([]);
          setAllBusinesses([]);
          setAnalyticsData({});
        }
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const localResults = allBusinesses.filter(business => 
        business.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.contactNumber?.includes(searchQuery) ||
        business.address?.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSearchResults(localResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching businesses:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMoreBusinesses = () => {
    if (!loadingMore && hasMoreData) {
      fetchBusinesses(false);
    }
  };

  const calculateAnalytics = (businessData) => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Basic metrics
    const totalBusinesses = businessData.length;
    const paidBusinesses = businessData.filter(b => 
      b.paymentStatus === 'completed' || b.payment?.status === 'completed'
    ).length;

    // Revenue analytics
    const totalRevenue = businessData
      .filter(b => b.paymentStatus === 'completed' || b.payment?.status === 'completed')
      .reduce((sum, b) => sum + (parseFloat(b.registrationFee) || parseFloat(b.payment?.amount) || 0), 0);
    
    const averageRevenue = totalBusinesses > 0 ? totalRevenue / totalBusinesses : 0;
    const conversionRate = totalBusinesses > 0 ? (paidBusinesses / totalBusinesses) * 100 : 0;

    // Time-based analytics
    const recentBusinesses30 = businessData.filter(b => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= last30Days;
    }).length;

    const recentBusinesses7 = businessData.filter(b => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= last7Days;
    }).length;

    // Category analytics
    const categoryCount = {};
    businessData.forEach(b => {
      if (b.categories) {
        b.categories.forEach(cat => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      }
    });

    // Location analytics
    const cityCount = {};
    businessData.forEach(b => {
      if (b.address?.city) {
        cityCount[b.address.city] = (cityCount[b.address.city] || 0) + 1;
      }
    });

    // Daily registrations for last 7 days
    const dailyData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayKey = date.toISOString().split('T')[0];
      dailyData[dayKey] = businessData.filter(b => {
        const businessDate = new Date(b.createdAt).toISOString().split('T')[0];
        return businessDate === dayKey;
      }).length;
    }

    // Monthly registration trend
    const monthlyData = {};
    businessData.forEach(business => {
      const date = new Date(business.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    setAnalyticsData({
      totalBusinesses,
      paidBusinesses,
      totalRevenue,
      averageRevenue,
      conversionRate,
      recentBusinesses30,
      recentBusinesses7,
      categoryCount,
      cityCount,
      monthlyData,
      dailyData
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchQuery('');
    setShowSearchResults(false);
    await Promise.all([
      fetchBusinesses(true),
      fetchUserAndSellerCounts()
    ]);
    setRefreshing(false);
  };

  // ... (keep all existing utility functions)

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatOperatingHours = (weeklySchedule) => {
    if (!weeklySchedule) return 'Not specified';
    
    const openDays = Object.keys(weeklySchedule).filter(day => 
      weeklySchedule[day]?.isOpen
    );
    
    if (openDays.length === 0) return 'Closed all days';
    if (openDays.length === 7) return 'Open all days';
    
    return `Open ${openDays.length} days`;
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return 'N/A';
    
    try {
      let date;
      
      if (timeValue.toDate) {
        date = timeValue.toDate();
      } else if (timeValue.seconds) {
        date = new Date(timeValue.seconds * 1000);
      } else if (typeof timeValue === 'string') {
        date = new Date(timeValue);
      } else if (timeValue instanceof Date) {
        date = timeValue;
      } else {
        date = new Date(timeValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  const openBusinessDetail = (business) => {
    setSelectedBusiness(business);
    setDetailModalVisible(true);
  };

  // Header Component
  const renderHeader = () => (
    <View className="bg-primary px-4 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            className="mr-4 p-2 rounded-lg bg-white/20"
          >
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-white font-bold text-xl">Business Analytics</Text>
            <Text className="text-white/80 text-sm">Dashboard Overview</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={onRefresh}
          className="p-2 rounded-lg bg-white/20"
        >
          <Icon name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced Search Bar with Results (keep existing implementation)
  const renderSearchBar = () => (
    <View className="bg-white shadow-sm">
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-gray-800"
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="ml-2"
            >
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {showSearchResults && (
        <View className="border-t border-gray-200">
          <View className="px-4 py-2 bg-gray-50">
            <Text className="text-gray-600 text-sm font-medium">
              {searchLoading ? 'Searching...' : `${searchResults.length} results found`}
            </Text>
          </View>
          
          {searchLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#FF4500" />
            </View>
          ) : (
            <FlatList
              data={searchResults.slice(0, 5)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-3 border-b border-gray-100"
                  onPress={() => {
                    openBusinessDetail(item);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800" numberOfLines={1}>
                        {item.businessName || 'Unnamed Business'}
                      </Text>
                      <Text className="text-gray-600 text-sm" numberOfLines={1}>
                        {item.ownerName} • {item.email}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full ${
                      item.paymentStatus === 'completed' || item.payment?.status === 'completed' 
                        ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <Text className={`text-xs font-semibold ${
                        item.paymentStatus === 'completed' || item.payment?.status === 'completed'
                          ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {item.paymentStatus === 'completed' || item.payment?.status === 'completed' ? 'PAID' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          )}
          
          {searchResults.length > 5 && (
            <TouchableOpacity 
              className="px-4 py-3 bg-gray-50 items-center"
              onPress={() => {
                setShowSearchResults(false);
              }}
            >
              <Text className="text-primary font-medium">
                View all {searchResults.length} results
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Enhanced Analytics Cards with User and Seller counts
  const renderAnalyticsCards = () => {
    const cards = [
      {
        title: 'Total Users',
        value: countsLoading ? '...' : userCount.toLocaleString(),
        subtitle: 'Registered users',
        icon: 'account-group',
        bgColor: 'bg-blue-500',
      },
      {
        title: 'Total Sellers',
        value: countsLoading ? '...' : sellerCount.toLocaleString(),
        subtitle: 'Active sellers',
        icon: 'store',
        bgColor: 'bg-indigo-500',
      },
      {
        title: 'Total Businesses',
        value: analyticsData.totalBusinesses || 0,
        subtitle: hasMoreData ? `${businesses.length}+ loaded` : 'All loaded',
        icon: 'office-building',
        bgColor: 'bg-green-500',
      },
      {
        title: 'Total Revenue',
        value: `₹${analyticsData.totalRevenue?.toLocaleString() || 0}`,
        subtitle: 'From loaded businesses',
        icon: 'currency-inr',
        bgColor: 'bg-purple-500',
      },
      {
        title: 'Paid Businesses',
        value: analyticsData.paidBusinesses || 0,
        subtitle: `${analyticsData.conversionRate?.toFixed(1) || 0}% conversion`,
        icon: 'check-circle',
        bgColor: 'bg-orange-500',
      },
      {
        title: 'Last 30 Days',
        value: analyticsData.recentBusinesses30 || 0,
        subtitle: 'New registrations',
        icon: 'calendar-month',
        bgColor: 'bg-red-500',
      }
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        className="px-4 py-4"
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {cards.map((card, index) => (
          <View
            key={index}
            className={`${card.bgColor} rounded-2xl p-4 mr-4 shadow-lg`}
            style={{ width: width * 0.7 }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-white/20 p-3 rounded-full">
                <Icon name={card.icon} size={24} color="#fff" />
              </View>
            </View>
            
            <Text className="text-white text-3xl font-bold mb-1">
              {card.value}
            </Text>
            <Text className="text-white text-lg font-semibold mb-1">
              {card.title}
            </Text>
            <Text className="text-white/80 text-sm">
              {card.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ... (keep all other existing render functions)

  const renderTrendChart = () => {
    const chartData = Object.entries(analyticsData.dailyData || {});
    const maxValue = Math.max(...chartData.map(([, count]) => count), 1);

    return (
      <View className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-lg">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xl font-bold text-gray-800">Daily Registrations</Text>
            <Text className="text-gray-500 text-sm">Last 7 days activity</Text>
          </View>
          <View className="bg-primary/10 p-2 rounded-full">
            <Icon name="chart-bar" size={20} color="#FF4500" />
          </View>
        </View>
        
        <View className="flex-row items-end justify-between h-40 mb-4">
          {chartData.map(([date, count], index) => (
            <View key={date} className="items-center flex-1">
              <View 
                className="bg-primary rounded-t-lg mb-2"
                style={{
                  width: 24,
                  height: Math.max((count / maxValue) * 120, count > 0 ? 8 : 2),
                }}
              />
              <Text className="text-xs text-gray-600 font-medium">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text className="text-xs font-bold text-gray-800 mt-1">
                {count}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row justify-between bg-gray-50 rounded-2xl p-4">
          <View className="items-center">
            <Text className="text-gray-500 text-xs">Total</Text>
            <Text className="text-gray-800 font-bold text-lg">
              {chartData.reduce((sum, [, count]) => sum + count, 0)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">Average</Text>
            <Text className="text-gray-800 font-bold text-lg">
              {(chartData.reduce((sum, [, count]) => sum + count, 0) / 7).toFixed(1)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">Peak</Text>
            <Text className="text-gray-800 font-bold text-lg">{maxValue}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryAnalytics = () => {
    const sortedCategories = Object.entries(analyticsData.categoryCount || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return (
      <View className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-lg">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xl font-bold text-gray-800">Top Categories</Text>
            <Text className="text-gray-500 text-sm">Most popular business types</Text>
          </View>
          <View className="bg-purple-500/10 p-2 rounded-full">
            <Icon name="chart-donut" size={20} color="#8B5CF6" />
          </View>
        </View>
        
        {sortedCategories.map(([category, count], index) => {
          const percentage = analyticsData.totalBusinesses > 0 ? 
            (count / analyticsData.totalBusinesses) * 100 : 0;
          
          return (
            <View key={category} className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'][index % 5]
                  }`}>
                    <Text className="text-white font-bold text-sm">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-semibold text-base">{category}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-xl font-bold text-gray-800">{count}</Text>
                  <Text className="text-xs text-gray-500">{percentage.toFixed(1)}%</Text>
                </View>
              </View>
              
              <View className="bg-gray-100 h-2 rounded-full overflow-hidden">
                <View 
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Enhanced Business Item Component (keep existing implementation)
  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-4 shadow-md border border-gray-100 mx-4"
      onPress={() => openBusinessDetail(item)}
      style={{ elevation: 3 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={1}>
            {item.businessName || 'Unnamed Business'}
          </Text>
          <Text className="text-gray-600 text-sm">
            Owner: {item.ownerName || 'N/A'}
          </Text>
        </View>
        <View className="items-end">
          <View className={`px-3 py-1 rounded-full ${
            item.paymentStatus === 'completed' || item.payment?.status === 'completed' 
              ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            <Text className={`text-xs font-semibold ${
              item.paymentStatus === 'completed' || item.payment?.status === 'completed'
                ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {item.paymentStatus === 'completed' || item.payment?.status === 'completed' ? 'PAID' : 'PENDING'}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs mt-1">
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <Icon name="email" size={14} color="#FF4500" />
        <Text className="text-gray-600 text-sm ml-2" numberOfLines={1}>
          {item.email || 'No email'}
        </Text>
      </View>

      <View className="flex-row items-center mb-2">
        <Icon name="phone" size={14} color="#FF4500" />
        <Text className="text-gray-600 text-sm ml-2">
          {item.contactNumber || 'No contact'}
        </Text>
      </View>

      <View className="flex-row items-center mb-3">
        <Icon name="map-marker" size={14} color="#FF4500" />
        <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>
          {item.address ? 
            `${item.address.street || ''}, ${item.address.city || ''}`.replace(/^,\s*/, '') 
            : 'No address'
          }
        </Text>
      </View>

      {item.categories && item.categories.length > 0 && (
        <View className="flex-row flex-wrap mb-2">
          {item.categories.slice(0, 2).map((category, index) => (
            <View key={index} className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-1">
              <Text className="text-blue-700 text-xs font-medium">
                {category}
              </Text>
            </View>
          ))}
          {item.categories.length > 2 && (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-gray-600 text-xs">
                +{item.categories.length - 2} more
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row justify-between items-center">
        <Text className="text-gray-500 text-xs">
          {formatOperatingHours(item.weeklySchedule)}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-primary text-sm font-medium mr-2">
            ₹{item.registrationFee || item.payment?.amount || '0'}
          </Text>
          <Icon name="chevron-right" size={16} color="#FF4500" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Business List with Lazy Loading (keep existing implementation)
  const renderBusinessList = () => (
    <View className="mx-4 mt-4 mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-bold text-gray-800">All Businesses</Text>
          <Text className="text-gray-500 text-sm">
            {businesses.length} businesses loaded{hasMoreData ? ' (more available)' : ' (all loaded)'}
          </Text>
        </View>
      </View>
      
      <FlatList
        data={businesses}
        renderItem={renderBusinessItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        onEndReached={loadMoreBusinesses}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => {
          if (loadingMore) {
            return (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#FF4500" />
                <Text className="text-gray-500 text-sm mt-2">Loading more businesses...</Text>
              </View>
            );
          }
          if (!hasMoreData && businesses.length > 0) {
            return (
              <View className="py-4 items-center">
                <Text className="text-gray-500 text-sm">No more businesses to load</Text>
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );

  // Complete Business Detail Modal (keep existing implementation)
  const renderBusinessDetail = () => {
    if (!selectedBusiness) return null;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg ml-4">Business Details</Text>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* Basic Information */}
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-primary-light rounded-full p-3 mr-4">
                    <Icon name="store" size={24} color="#FF4500" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-800">
                      {selectedBusiness.businessName || 'Unnamed Business'}
                    </Text>
                    <Text className="text-gray-600">
                      Owner: {selectedBusiness.ownerName || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center mb-3">
                    <Icon name="email" size={18} color="#FF4500" />
                    <Text className="text-gray-700 ml-3 flex-1">
                      {selectedBusiness.email || 'No email provided'}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Icon name="phone" size={18} color="#FF4500" />
                    <Text className="text-gray-700 ml-3">
                      {selectedBusiness.contactNumber || 'No contact provided'}
                    </Text>
                  </View>

                  <View className="flex-row items-start">
                    <Icon name="map-marker" size={18} color="#FF4500" />
                    <View className="ml-3 flex-1">
                      <Text className="text-gray-700">
                        {selectedBusiness.address?.street && `${selectedBusiness.address.street}, `}
                        {selectedBusiness.address?.city || 'No address provided'}
                      </Text>
                      {selectedBusiness.address?.pinCode && (
                        <Text className="text-gray-500 text-sm">
                          PIN: {selectedBusiness.address.pinCode}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Payment Information */}
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-green-100 rounded-full p-3 mr-4">
                    <Icon name="currency-inr" size={24} color="#059669" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Payment Details</Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Registration Fee:</Text>
                  <Text className="text-lg font-bold text-primary">
                    ₹{selectedBusiness.registrationFee || '0'}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Payment Status:</Text>
                  <View className={`px-3 py-1 rounded-full ${
                    selectedBusiness.paymentStatus === 'completed' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Text className={`text-sm font-medium ${
                      selectedBusiness.paymentStatus === 'completed' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {selectedBusiness.paymentStatus || 'Pending'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Registration Date:</Text>
                  <Text className="text-gray-800 font-medium">
                    {formatDate(selectedBusiness.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Categories */}
              {selectedBusiness.categories && selectedBusiness.categories.length > 0 && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-blue-100 rounded-full p-3 mr-4">
                      <Icon name="tag-multiple" size={24} color="#2563EB" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Categories</Text>
                  </View>

                  <View className="flex-row flex-wrap">
                    {selectedBusiness.categories.map((category, index) => (
                      <View key={index} className="bg-blue-100 px-3 py-2 rounded-full mr-2 mb-2">
                        <Text className="text-blue-700 font-medium">
                          {category}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Subcategories */}
              {selectedBusiness.subCategories && selectedBusiness.subCategories.length > 0 && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-purple-100 rounded-full p-3 mr-4">
                      <Icon name="tag-outline" size={24} color="#7C3AED" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Subcategories</Text>
                  </View>

                  <View className="flex-row flex-wrap">
                    {selectedBusiness.subCategories.map((subCategory, index) => (
                      <View key={index} className="bg-purple-100 px-3 py-2 rounded-full mr-2 mb-2">
                        <Text className="text-purple-700 font-medium">
                          {subCategory}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Operating Hours */}
              {selectedBusiness.weeklySchedule && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-orange-100 rounded-full p-3 mr-4">
                      <Icon name="clock-outline" size={24} color="#EA580C" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Operating Hours</Text>
                  </View>

                  {Object.keys(selectedBusiness.weeklySchedule).map((day) => {
                    const schedule = selectedBusiness.weeklySchedule[day];
                    return (
                      <View key={day} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                        <Text className="text-gray-700 font-medium">{day}</Text>
                        {schedule?.isOpen ? (
                          <Text className="text-gray-600">
                            {schedule.openTime && schedule.closeTime ? 
                              `${formatTime(schedule.openTime)} - ${formatTime(schedule.closeTime)}` 
                              : 'Open'
                            }
                          </Text>
                        ) : (
                          <Text className="text-red-500">Closed</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Business Images */}
              {selectedBusiness.images && selectedBusiness.images.length > 0 && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-indigo-100 rounded-full p-3 mr-4">
                      <Icon name="image-multiple" size={24} color="#4F46E5" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Business Images</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row">
                      {selectedBusiness.images.map((imageData, index) => (
                        <View key={index} className="mr-3">
                          <Image
                            source={{ uri: `data:image/jpeg;base64,${imageData.base64}` }}
                            className="w-32 h-32 rounded-lg"
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Location */}
              {selectedBusiness.location && (selectedBusiness.location.latitude || selectedBusiness.location.longitude) && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-red-100 rounded-full p-3 mr-4">
                      <Icon name="map" size={24} color="#DC2626" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Location</Text>
                  </View>

                  <View className="space-y-2">
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-gray-600">Latitude:</Text>
                      <Text className="text-gray-800 font-medium">
                        {selectedBusiness.location.latitude?.toFixed(6) || 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Longitude:</Text>
                      <Text className="text-gray-800 font-medium">
                        {selectedBusiness.location.longitude?.toFixed(6) || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-4 text-gray-600 text-lg font-semibold">Loading Analytics...</Text>
        <Text className="text-gray-500 text-sm">Preparing your dashboard</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF4500" />
      
      {renderHeader()}
      {renderSearchBar()}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF4500']}
            tintColor="#FF4500"
          />
        }
      >
        {!showSearchResults && (
          <>
            {renderAnalyticsCards()}
            {renderTrendChart()}
            {renderCategoryAnalytics()}
          </>
        )}
        {renderBusinessList()}
      </ScrollView>

      {renderBusinessDetail()}
    </KeyboardAvoidingView>
  );
};

export default AdminBusinessAnalyticsScreen;
