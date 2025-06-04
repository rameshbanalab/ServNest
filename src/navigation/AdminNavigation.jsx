import { createDrawerNavigator } from '@react-navigation/drawer';
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminSubcategoriesScreen from '../screens/admin/SubCategories';

const Drawer = createDrawerNavigator();

export default function AdminNavigation() {
  return (
    <Drawer.Navigator
      initialRouteName="Categories"
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
      <Drawer.Screen name="Categories" component={AdminCategoriesScreen} />
      <Drawer.Screen name="Edit Price" component={AdminPricingScreen} />
      <Drawer.Screen name="Sub Category" component={AdminSubcategoriesScreen} />
    </Drawer.Navigator>
  );
}
