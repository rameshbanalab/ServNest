import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminSubcategoriesScreen from '../screens/admin/SubCategories';
import AdminBusinessScreen from '../screens/admin/Business';

const Drawer = createDrawerNavigator();

export default function AdminNavigation() {
  return (
    <Drawer.Navigator
      initialRouteName="Businesses"
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#8BC34A',
        drawerLabelStyle: {fontWeight: 'bold'},
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: '#f5f5f5',
          width: 240,
        },
        drawerItemStyle: {
          marginVertical: 5,
          paddingVertical: 10,
          borderRadius: 8,
        },
        drawerActiveBackgroundColor: '#e8f5e9',
      }}>
        <Drawer.Screen 
        name="Businesses" 
        component={AdminBusinessScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="business" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Categories" 
        component={AdminCategoriesScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="category" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Edit Price" 
        component={AdminPricingScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="attach-money" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Sub Category" 
        component={AdminSubcategoriesScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="subdirectory-arrow-right" size={size} color={color} />
          ),
        }}
      />
      
    </Drawer.Navigator>
  );
}
