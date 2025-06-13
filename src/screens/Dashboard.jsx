import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width, height} = Dimensions.get('window');

export default function Dashboard() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const [userName, setUserName] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    // loadUserInfo();



    startAnimations();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        setUserName(parsed.name || parsed.fullName || 'User');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dashboardItems = [
    {
      id: 1,
      title: t('dashboard.services'),
      subtitle: t('dashboard.find_local_services'),
      icon: 'home-repair-service',
      color: '#8BC34A',
      bgColor: '#F1F8E9',
      route: 'Main',
      iconBg: '#E8F5E8',
    },
    {
      id: 2,
      title: t('dashboard.events'),
      subtitle: t('dashboard.discover_events'),
      icon: 'event',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      route: 'EventsManagement',
      iconBg: '#E1F5FE',
    },
    {
      id: 3,
      title: t('dashboard.jobs'),
      subtitle: t('dashboard.find_opportunities'),
      icon: 'work',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      route: 'Jobs',
      iconBg: '#FFF8E1',
    },
    {
      id: 4,
      title: t('dashboard.donations'),
      subtitle: t('dashboard.make_difference'),
      icon: 'volunteer-activism',
      color: '#E91E63',
      bgColor: '#FCE4EC',
      route: 'DonationsPage',
      iconBg: '#F8BBD9',
    },
  ];

  const handleItemPress = (route) => {
    navigation.navigate(route);
  };

  const renderDashboardItem = (item, index) => (
    <Animated.View
      key={item.id}
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 50],
              outputRange: [0, 50 + index * 15],
            }),
          },
          {scale: scaleAnim},
        ],
      }}
      className="mb-4">
      <TouchableOpacity
        onPress={() => handleItemPress(item.route)}
        activeOpacity={0.7}
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          elevation: 6,
          shadowColor: item.color,
          shadowOffset: {width: 0, height: 3},
          shadowOpacity: 0.15,
          shadowRadius: 8,
          borderWidth: 1,
          borderColor: '#F0F0F0',
        }}>
        
        {/* Top accent bar */}
        <View 
          className="h-1 w-full"
          style={{backgroundColor: item.color}}
        />
        
        <View className="p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              {/* Icon and Title Row */}
              <View className="flex-row items-center mb-3">
                <View 
                  className="rounded-xl p-3 mr-4"
                  style={{backgroundColor: item.iconBg}}>
                  <Icon name={item.icon} size={24} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-bold text-lg mb-1"
                    style={{color: '#1A1A1A'}}>
                    {item.title}
                  </Text>
                  <Text 
                    className="text-sm"
                    style={{color: '#666666'}}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              
              {/* Action Row */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text 
                    className="text-sm font-medium mr-2"
                    style={{color: item.color}}>
                    {t('dashboard.tap_to_explore')}
                  </Text>
                  <Icon name="arrow-forward" size={16} color={item.color} />
                </View>
                
                {/* Decorative dots */}
                <View className="flex-row space-x-1">
                  <View 
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: item.color, opacity: 0.3}}
                  />
                  <View 
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: item.color, opacity: 0.5}}
                  />
                  <View 
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: item.color}}
                  />
                </View>
              </View>
            </View>

            {/* Large decorative icon */}
            <View 
              className="rounded-2xl p-4 ml-4"
              style={{backgroundColor: item.bgColor}}>
              <Icon name={item.icon} size={32} color={item.color} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: '#FAFAFA'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Enhanced Header */}
      {/* <Animated.View 
        style={{opacity: fadeAnim}}
        className="bg-white px-6 py-6 border-b"
        style={{
          borderBottomColor: '#E5E5E5',
          borderBottomWidth: 1,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.1,
          shadowRadius: 3,
        }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-gray-500 text-sm font-medium">
              {t('dashboard.welcome_back')}
            </Text>
            <Text className="text-gray-900 font-bold text-2xl mt-1">
              {userName || t('dashboard.user')}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            className="rounded-2xl p-4"
            style={{
              backgroundColor: '#8BC34A',
              elevation: 3,
              shadowColor: '#8BC34A',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}>
            <Icon name="person" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View> */}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}>
        
        {/* Welcome Section */}
        <Animated.View
          style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}
          className="px-6 py-8">
          <Text className="text-gray-900 font-bold text-3xl mb-3">
            {t('dashboard.choose_service')}
          </Text>
          <Text className="text-gray-600 text-base leading-7">
            {t('dashboard.explore_description')}
          </Text>
        </Animated.View>

        {/* Dashboard Items */}
        <View className="px-6">
          {dashboardItems.map((item, index) => renderDashboardItem(item, index))}
        </View>

        

        {/* Enhanced Skip Button */}
        <Animated.View 
          style={{opacity: fadeAnim}}
          className="px-6 mt-8">
          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            className="bg-gray-100 rounded-2xl py-4 border border-gray-200"
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 3,
            }}>
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-700 font-semibold text-base mr-2">
                {t('dashboard.skip_to_home')}
              </Text>
              <Icon name="home" size={20} color="#666666" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom spacing */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
