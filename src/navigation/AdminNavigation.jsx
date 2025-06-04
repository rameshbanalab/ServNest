// App.js
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';

const Drawer = createDrawerNavigator();

export default function AdminNavigation() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Categories">
        <Drawer.Screen name="Categories" component={AdminCategoriesScreen} />
        <Drawer.Screen name="Pricing" component={AdminPricingScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
