import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

const AdminCategoriesScreen = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'Categories'), (snapshot) => {
      const categoriesData = [];
      snapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const pickImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    setImageLoading(true);
    launchImageLibrary(options, (response) => {
      setImageLoading(false);
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const base64String = asset.base64;
        const dataUri = `data:${asset.type};base64,${base64String}`;
        setImage(dataUri);
      }
    });
  };

  const removeImage = () => {
    setImage(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }

    if (!image) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setSubmitting(true);
    try {
      const base64String = image.split(',')[1];
      const categoryData = {
        category_name: name.trim(),
        image: base64String,
      };

      if (editingId) {
        await updateDoc(doc(db, 'Categories', editingId), categoryData);
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await addDoc(collection(db, 'Categories'), categoryData);
        Alert.alert('Success', 'Category added successfully');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Categories', id));
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const editCategory = (category) => {
    setName(category.category_name);
    if (category.image && !category.image.startsWith('data:')) {
      setImage(`data:image/jpeg;base64,${category.image}`);
    } else {
      setImage(category.image);
    }
    setEditingId(category.id);
  };

  const resetForm = () => {
    setName('');
    setImage(null);
    setEditingId(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically update the data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  const navigation = useNavigation();

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading categories...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Header */}
      <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-4">
          {editingId ? 'Edit Category' : 'Add New Category'}
        </Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
            title="Pull to refresh"
            titleColor="#8BC34A"
          />
        }
      >
        <View className="p-4">
          {/* Add/Edit Form */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
            <TextInput
              className="bg-gray-100 rounded-lg mt-2 p-3 mb-4"
              style={{ color: '#000000' }}
              placeholder="Category Name"
              placeholderTextColor="#666666"
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />

            <View className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center mb-4">
              {imageLoading ? (
                <View className="w-24 h-24 items-center justify-center">
                  <ActivityIndicator size="small" color="#8BC34A" />
                  <Text className="text-gray-500 mt-2 text-sm">Loading image...</Text>
                </View>
              ) : image ? (
                <View className="relative w-24 h-24">
                  <Image
                    source={{ uri: image }}
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                    onPress={removeImage}
                    disabled={submitting}
                  >
                    <Icon name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="items-center"
                  onPress={pickImage}
                  disabled={submitting}
                >
                  <Icon name="add-a-photo" size={32} color={submitting ? "#9CA3AF" : "#6b7280"} />
                  <Text className={`mt-2 ${submitting ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select Image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className={`px-6 py-2 rounded-lg flex-1 mr-2 ${submitting ? 'bg-blue-300' : 'bg-blue-500'}`}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <View className="flex-row items-center justify-center">
                  {submitting && (
                    <ActivityIndicator size="small" color="white" className="mr-2" />
                  )}
                  <Text className="text-white font-bold text-center">
                    {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
                  </Text>
                </View>
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity
                  className="bg-gray-500 px-6 py-2 rounded-lg flex-1 ml-2"
                  onPress={resetForm}
                  disabled={submitting}
                >
                  <Text className="text-white font-bold text-center">Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Categories List */}
          {categories.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Icon name="category" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-lg mt-4">No categories found</Text>
              <Text className="text-gray-400 text-sm mt-2">Add your first category to get started</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 24 }}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              renderItem={({ item }) => (
                <View className="bg-white rounded-xl p-4 mb-4 shadow-sm w-[48%]">
                  <View className="relative">
                    {item.image ? (
                      <Image
                        source={{ uri: typeof item.image === 'string' && !item.image.startsWith('data:') ? `data:image/jpeg;base64,${item.image}` : item.image }}
                        className="w-full h-32 rounded-lg mb-2"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-32 bg-primary-light rounded-lg mb-2 items-center justify-center">
                        <Icon name={item.icon || 'business'} size={40} color="#8BC34A" />
                      </View>
                    )}
                    
                    <View className="absolute top-2 right-2 flex-row">
                      <TouchableOpacity
                        className="bg-blue-500 p-1 rounded-full mr-1"
                        onPress={() => editCategory(item)}
                        disabled={submitting}
                      >
                        <Icon name="edit" size={20} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-red-500 p-1 rounded-full"
                        onPress={() => deleteCategory(item.id)}
                        disabled={submitting}
                      >
                        <Icon name="delete" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text className="font-semibold text-gray-800 text-center">
                    {item.category_name}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AdminCategoriesScreen;
