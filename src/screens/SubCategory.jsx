import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SubcategoriesScreen = () => {
  const route = useRoute();
  const {category, services = []} = route.params || {};
  const {height} = Dimensions.get('window');
  const cardHeight = height * 0.18;
  const navigation = useNavigation();
  const fadeAnim = React.useState(new Animated.Value(0))[0];


  // Trigger animation on component mount
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Navigate to services for a specific subcategory
  const navigateToSubcategoryServices = subcategory => {
    const subcategoryServices = services.filter(service =>
      service.subCategories.includes(subcategory.name),
    );

    navigation.navigate('Services', {
      category: category.name,
      subcategory: subcategory.name,
      services: subcategoryServices,
      title: `${subcategory.name} Services`,
    });
  };

  // Navigate to all services for this category
  const navigateToAllServices = () => {
    navigation.navigate('Services', {
      category: category.name,
      services: services,
      title: `All ${category.name} Services`,
    });
  };

  // Component to render subcategory image or fallback icon
  const SubcategoryImage = ({ subcategory }) => {
    const [imageError, setImageError] = React.useState(false);

    if (subcategory.image && !imageError) {
      return (
        <Image
          source={{ 
            uri: `data:image/jpeg;base64,${subcategory.image}` 
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
          }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback to icon if image fails or doesn't exist
    return (
      <Icon
        name={subcategory.icon || "business"}
        size={38}
        color="#8BC34A"
      />
    );
  };

  // Fallback UI if category is undefined or not passed
  if (!category) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">
          Error: Category data not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-lg p-3 shadow-sm"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold px-4 py-1">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-5 shadow-md">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full bg-primary-dark shadow-sm">
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <View className="bg-primary-light rounded-full p-2 mr-3">
            <Icon
              name={category.icon || 'category'}
              size={24}
              color="#689F38"
            />
          </View>
          <Text className="text-white font-bold text-xl">
            {category.name || 'Unknown Category'}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Content */}
      <Animated.ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        style={{opacity: fadeAnim}}>
        {/* Category Description */}
        {category.description && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
            <Text className="text-gray-700 text-base">
              {category.description}
            </Text>
          </View>
        )}

        {/* Services Count */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-700 font-bold text-lg">
            Choose Subcategory
          </Text>
          <Text className="text-gray-500 text-sm">
            {services.length} services available
          </Text>
        </View>

        {/* Subcategories Grid */}
        <View className="flex-row flex-wrap justify-between">
          {category.subcategories && category.subcategories.length > 0 ? (
            category.subcategories.map(sub => {
              const subcategoryServices = services.filter(service =>
                service.subCategories.includes(sub.name),
              );

              return (
                <TouchableOpacity
                  key={sub.id || `sub-${Math.random()}`}
                  className="w-[48%] bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100"
                  style={{height: cardHeight, elevation: 2}}
                  onPress={() => navigateToSubcategoryServices(sub)}>
                  <View className="flex-1 items-center justify-center">
                    <View className="bg-primary-light rounded-full p-3 mb-2 shadow-sm">
                      <SubcategoryImage subcategory={sub} />
                    </View>
                    <Text className="text-center text-gray-800 text-sm font-semibold mb-1">
                      {sub.name || 'Unnamed Subcategory'}
                    </Text>
                    <Text className="text-center text-gray-500 text-xs">
                      {subcategoryServices.length} services
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="w-full items-center justify-center mt-10">
              <Text className="text-gray-600 text-base">
                No subcategories available for this category.
              </Text>
            </View>
          )}
        </View>

        {/* All Services Button */}
        {services.length > 0 && (
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 mt-6 shadow-md"
            onPress={navigateToAllServices}>
            <Text className="text-white font-bold text-lg text-center">
              View All {services.length} {category.name} Services
            </Text>
          </TouchableOpacity>
        )}

        {/* Extra padding at the bottom */}
        <View className="h-10" />
      </Animated.ScrollView>
    </View>
  );
};

export default SubcategoriesScreen;
