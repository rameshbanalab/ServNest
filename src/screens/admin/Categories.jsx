import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';

const AdminCategoriesScreen = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'Categories'), (snapshot) => {
      const categoriesData = [];
      snapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesData);
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

    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        // Store only the base64 string, not the full data URI
        // If you want to display the image, you still need to prefix it with data URI
        // For saving to Firestore, store only the base64 string
        // For this example, we will store the base64 string, but display the data URI
        // (In practice, you may want to always prefix the base64 with data:image/... when displaying)
        const base64String = asset.base64;
        const dataUri = `data:${asset.type};base64,${base64String}`;
        setImage(dataUri); // For display
        // For saving: setImage(base64String);
        // But in this code, we'll use the data URI for display and the base64 string for saving
        // So, we'll have to extract the base64 string from image when saving
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

    try {
      // Extract the base64 string from the data URI
      const base64String = image.split(',')[1];
      const categoryData = {
        category_name: name.trim(),
        image: base64String, // Save only the base64 string
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
    // When displaying, reconstruct the data URI if only base64 is stored
    // For this example, assuming image is stored as base64 string in Firestore
    // So, when editing, we need to construct the data URI for display
    if (category.image && !category.image.startsWith('data:')) {
      // If it's just base64, we don't know the MIME type, so use a default
      // In practice, you should store the MIME type as well
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

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Add/Edit Form */}
      <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
        <Text className="text-lg font-bold mb-4">
          {editingId ? 'Edit Category' : 'Add New Category'}
        </Text>

        <TextInput
          className="bg-gray-100 rounded-lg p-3 mb-4"
          placeholder="Category Name"
          value={name}
          onChangeText={setName}
        />

        <View className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center mb-4">
          {image ? (
            <View className="relative w-24 h-24">
              <Image
                source={{ uri: image }}
                className="w-full h-full rounded-lg"
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                onPress={removeImage}
              >
                <Icon name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="items-center"
              onPress={pickImage}
            >
              <Icon name="add-a-photo" size={32} color="#6b7280" />
              <Text className="text-gray-500 mt-2">Select Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row justify-between">
          <TouchableOpacity
            className="bg-blue-500 px-6 py-2 rounded-lg flex-1 mr-2"
            onPress={handleSubmit}
          >
            <Text className="text-white font-bold text-center">
              {editingId ? 'Update' : 'Add'}
            </Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              className="bg-gray-500 px-6 py-2 rounded-lg flex-1 ml-2"
              onPress={resetForm}
            >
              <Text className="text-white font-bold text-center">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories List */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 24 }}
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
                  <Icon name="business" size={40} color="#8BC34A" />
                </View>
              )}
              
              <View className="absolute top-2 right-2 flex-row">
                <TouchableOpacity
                  className="bg-blue-500 p-1 rounded-full mr-1"
                  onPress={() => editCategory(item)}
                >
                  <Icon name="edit" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-red-500 p-1 rounded-full"
                  onPress={() => deleteCategory(item.id)}
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
    </View>
  );
};

export default AdminCategoriesScreen;
