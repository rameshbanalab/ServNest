import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where } from 'firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';

const AdminSubcategoriesScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [icon, setIcon] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Fetch all categories
  useEffect(() => {
    console.log('Fetching categories...');
    const unsubscribe = onSnapshot(collection(db, 'Categories'), (snapshot) => {
      const categoriesData = [];
      snapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      console.log('Categories fetched:', categoriesData);
      setCategories(categoriesData);
    }, (error) => {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to fetch categories');
    });
    return () => unsubscribe();
  }, []);

  // Fetch subcategories for selected category
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategories([]);
      return;
    }
    
    console.log('Fetching subcategories for category:', selectedCategoryId);
    setIsLoading(true);
    
    // Fixed: Use string comparison instead of Number conversion
    const q = query(
      collection(db, 'SubCategories'), 
      where('category_id', '==', Number(selectedCategoryId))
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subcategoriesData = [];
      snapshot.forEach((doc) => {
        subcategoriesData.push({ id: doc.id, ...doc.data() });
      });
      console.log('Subcategories fetched:', subcategoriesData);
      setSubcategories(subcategoriesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching subcategories:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to fetch subcategories');
    });
    
    return () => unsubscribe();
  }, [selectedCategoryId]);

  const pickImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }
      if (response.assets?.[0]) {
        const asset = response.assets[0];
        setImage(`data:${asset.type};base64,${asset.base64}`);
      }
    });
  };

  const removeImage = () => setImage(null);

  const handleSubmit = async () => {
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter subcategory name');
      return;
    }
    
    try {
      setIsLoading(true);
      const subcategoryData = {
        sub_category_name: name.trim(),
        category_id:Number(selectedCategoryId),
        icon: icon.trim() || 'business',
        image: image?.split(',')[1] || null,
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'SubCategories', editingId), subcategoryData);
        Alert.alert('Success', 'Subcategory updated');
      } else {
        await addDoc(collection(db, 'SubCategories'), subcategoryData);
        Alert.alert('Success', 'Subcategory added');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      Alert.alert('Error', 'Failed to save subcategory');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSubcategory = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this subcategory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'SubCategories', id));
              Alert.alert('Success', 'Subcategory deleted');
            } catch (error) {
              console.error('Error deleting subcategory:', error);
              Alert.alert('Error', 'Failed to delete subcategory');
            }
          },
        },
      ]
    );
  };

  const editSubcategory = (sub) => {
    setName(sub.sub_category_name || sub.name); // Handle both field names
    setIcon(sub.icon || '');
    setImage(sub.image ? `data:image/jpeg;base64,${sub.image}` : null);
    setEditingId(sub.id);
  };

  const resetForm = () => {
    setName('');
    setIcon('');
    setImage(null);
    setEditingId(null);
  };

  const selectCategory = (category) => {
    setSelectedCategoryId(category.id);
    setSelectedCategory(category);
    setShowCategoryModal(false);
    resetForm();
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-4">Manage Subcategories</Text>
      </View>

      <View className="p-4">
        {/* Beautiful Category Dropdown */}
        <View className="mb-6">
          <Text className="text-lg font-bold mb-3 text-gray-800">Select Category</Text>
          <TouchableOpacity
            className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex-row justify-between items-center"
            onPress={() => setShowCategoryModal(true)}
            style={{ elevation: 4 }}
          >
            <View className="flex-row items-center flex-1">
              {selectedCategory ? (
                <>
                  {selectedCategory.image ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${selectedCategory.image}` }}
                      className="w-14 h-14 rounded-full mr-4 border-2 border-primary-light"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-primary-light mr-4 items-center justify-center">
                      <Icon name="category" size={28} color="#8BC34A" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-gray-800 font-bold text-lg">
                      {selectedCategory.category_name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {subcategories.length} subcategories
                    </Text>
                  </View>
                </>
              ) : (
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-gray-200 mr-4 items-center justify-center">
                    <Icon name="add" size={28} color="#9CA3AF" />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-lg font-medium">Choose a category</Text>
                    <Text className="text-gray-400 text-sm">Select to manage subcategories</Text>
                  </View>
                </View>
              )}
            </View>
            <View className="bg-primary-light rounded-full p-2">
              <Icon name="keyboard-arrow-down" size={24} color="#8BC34A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Enhanced Category Selection Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
        >
          <View className="flex-1 bg-black bg-opacity-60 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-96">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-800">Select Category</Text>
                <TouchableOpacity 
                  onPress={() => setShowCategoryModal(false)}
                  className="bg-gray-100 rounded-full p-2"
                >
                  <Icon name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center p-4 bg-gray-50 rounded-xl mb-3 border border-gray-100"
                    onPress={() => selectCategory(item)}
                    style={{ elevation: 2 }}
                  >
                    {item.image ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${item.image}` }}
                        className="w-16 h-16 rounded-full mr-4 border-2 border-primary-light"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-full bg-primary-light mr-4 items-center justify-center">
                        <Icon name="category" size={28} color="#8BC34A" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-gray-800 font-bold text-lg">
                        {item.category_name}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        Tap to select
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#8BC34A" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Enhanced Add/Edit Form */}
        {selectedCategoryId && (
          <>
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100" style={{ elevation: 4 }}>
              <View className="flex-row items-center mb-6">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name={editingId ? "edit" : "add"} size={24} color="#8BC34A" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">
                  {editingId ? 'Edit Subcategory' : 'Add New Subcategory'}
                </Text>
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Subcategory Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter subcategory name"
                  value={name}
                  onChangeText={setName}
                  style={{ fontSize: 16 }}
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Icon Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="MaterialIcons name (e.g., business)"
                  value={icon}
                  onChangeText={setIcon}
                  style={{ fontSize: 16 }}
                />
              </View>
              
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Image</Text>
                <View className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center bg-gray-50">
                  {image ? (
                    <View className="relative">
                      <Image
                        source={{ uri: image }}
                        className="w-32 h-32 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-2"
                        onPress={removeImage}
                      >
                        <Icon name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      className="items-center py-4"
                      onPress={pickImage}
                    >
                      <View className="bg-primary-light rounded-full p-4 mb-3">
                        <Icon name="add-a-photo" size={32} color="#8BC34A" />
                      </View>
                      <Text className="text-gray-500 font-medium">Select Image</Text>
                      <Text className="text-gray-400 text-sm mt-1">Tap to choose from gallery</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="flex-row justify-between">
                <TouchableOpacity
                  className="bg-primary px-8 py-4 rounded-xl flex-1 mr-3 items-center shadow-md"
                  onPress={handleSubmit}
                  disabled={isLoading}
                  style={{ elevation: 3 }}
                >
                  <Text className="text-white font-bold text-lg">
                    {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
                {editingId && (
                  <TouchableOpacity
                    className="bg-gray-500 px-8 py-4 rounded-xl flex-1 ml-3 items-center shadow-md"
                    onPress={resetForm}
                    style={{ elevation: 3 }}
                  >
                    <Text className="text-white font-bold text-lg">Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Enhanced Subcategories List */}
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Subcategories
                </Text>
                <View className="bg-primary-light rounded-full px-3 py-1">
                  <Text className="text-primary-dark font-bold">{subcategories.length}</Text>
                </View>
              </View>
              
              {isLoading ? (
                <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
                  <ActivityIndicator size="large" color="#8BC34A" />
                  <Text className="mt-4 text-gray-500 font-medium">Loading subcategories...</Text>
                </View>
              ) : subcategories.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
                  <View className="bg-gray-100 rounded-full p-6 mb-4">
                    <Icon name="category" size={48} color="#9CA3AF" />
                  </View>
                  <Text className="text-gray-500 font-medium text-lg">No subcategories found</Text>
                  <Text className="text-gray-400 text-center mt-2">Add a subcategory to get started</Text>
                </View>
              ) : (
                <FlatList
                  data={subcategories}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  renderItem={({ item }) => (
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-md border border-gray-100" style={{ elevation: 3 }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          {item.image ? (
                            <Image
                              source={{ uri: `data:image/jpeg;base64,${item.image}` }}
                              className="w-16 h-16 rounded-xl mr-4 border border-gray-200"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-16 h-16 bg-primary-light rounded-xl mr-4 items-center justify-center">
                              <Icon name={item.icon || 'category'} size={28} color="#8BC34A" />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text className="font-bold text-lg text-gray-800">
                              {item.sub_category_name || item.name}
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1">
                              {selectedCategory?.category_name}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row">
                          <TouchableOpacity
                            className="bg-blue-500 p-3 rounded-xl mr-3 shadow-sm"
                            onPress={() => editSubcategory(item)}
                            style={{ elevation: 2 }}
                          >
                            <Icon name="edit" size={18} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="bg-red-500 p-3 rounded-xl shadow-sm"
                            onPress={() => deleteSubcategory(item.id)}
                            style={{ elevation: 2 }}
                          >
                            <Icon name="delete" size={18} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default AdminSubcategoriesScreen;
