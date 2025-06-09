import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy 
} from 'firebase/firestore';

const AdminJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    experience: '',
    salary: '',
    description: '',
    requirements: '',
    applyUrl: '',
    contactEmail: '',
    deadline: '',
  });

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const jobsQuery = query(
        collection(db, 'Jobs'),
        orderBy('createdAt', 'desc')
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      
      if (!jobsSnapshot.empty) {
        const jobsData = jobsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJobs(jobsData);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.company || !formData.applyUrl) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const jobData = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      if (editingJob) {
        await updateDoc(doc(db, 'Jobs', editingJob.id), {
          ...jobData,
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Job updated successfully');
      } else {
        await addDoc(collection(db, 'Jobs'), jobData);
        Alert.alert('Success', 'Job posted successfully');
      }

      resetForm();
      setModalVisible(false);
      fetchJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job');
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      type: job.type || 'Full-time',
      experience: job.experience || '',
      salary: job.salary || '',
      description: job.description || '',
      requirements: job.requirements || '',
      applyUrl: job.applyUrl || '',
      contactEmail: job.contactEmail || '',
      deadline: job.deadline || '',
    });
    setModalVisible(true);
  };

  const handleDelete = (jobId) => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job posting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Jobs', jobId));
              Alert.alert('Success', 'Job deleted successfully');
              fetchJobs();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      type: 'Full-time',
      experience: '',
      salary: '',
      description: '',
      requirements: '',
      applyUrl: '',
      contactEmail: '',
      deadline: '',
    });
    setEditingJob(null);
  };

  const renderJobItem = ({ item }) => (
    <View className="bg-white rounded-2xl p-4 mb-4 mx-4 shadow-md border border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-700 mb-1" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-gray-600 text-sm">{item.company}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            className="bg-primary/10 p-2 rounded-full mr-2"
          >
            <Icon name="pencil" size={18} color="#8BC34A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            className="bg-red-100 p-2 rounded-full"
          >
            <Icon name="delete" size={18} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <Icon name="map-marker" size={14} color="#8BC34A" />
        <Text className="text-gray-600 text-sm ml-2">{item.location}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className={`px-3 py-1 rounded-full ${
          item.type === 'Full-time' ? 'bg-primary/10' :
          item.type === 'Part-time' ? 'bg-accent-yellow/20' :
          item.type === 'Contract' ? 'bg-accent-blue/10' :
          item.type === 'Internship' ? 'bg-purple-100' : 'bg-green-100'
        }`}>
          <Text className={`text-xs font-medium ${
            item.type === 'Full-time' ? 'text-primary' :
            item.type === 'Part-time' ? 'text-yellow-700' :
            item.type === 'Contract' ? 'text-accent-blue' :
            item.type === 'Internship' ? 'text-purple-700' : 'text-green-700'
          }`}>
            {item.type}
          </Text>
        </View>
        <Text className="text-gray-500 text-xs">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 bg-gray-50">
        <View className="bg-primary px-4 py-4" style={{ paddingTop: StatusBar.currentHeight + 10 }}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              className="p-2 rounded-lg bg-white/20"
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">
              {editingJob ? 'Edit Job' : 'Post New Job'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-white/20 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-bold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {/* Job Title */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Job Title *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="e.g. Senior React Native Developer"
              value={formData.title}
              onChangeText={(text) => setFormData({...formData, title: text})}
            />
          </View>

          {/* Company */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Company *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="Company name"
              value={formData.company}
              onChangeText={(text) => setFormData({...formData, company: text})}
            />
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Location</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="e.g. Mumbai, India"
              value={formData.location}
              onChangeText={(text) => setFormData({...formData, location: text})}
            />
          </View>

          {/* Job Type */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {jobTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({...formData, type})}
                    className={`px-4 py-2 rounded-full mr-2 ${
                      formData.type === type ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`font-medium ${
                      formData.type === type ? 'text-white' : 'text-gray-700'
                    }`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Experience */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Experience Required</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="e.g. 2-5 years"
              value={formData.experience}
              onChangeText={(text) => setFormData({...formData, experience: text})}
            />
          </View>

          {/* Salary */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Salary Range</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="e.g. ₹5-8 LPA"
              value={formData.salary}
              onChangeText={(text) => setFormData({...formData, salary: text})}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Job Description</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="Describe the role and responsibilities..."
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Requirements */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Requirements</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="List the required skills and qualifications..."
              value={formData.requirements}
              onChangeText={(text) => setFormData({...formData, requirements: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Apply URL */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Application URL *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="https://forms.google.com/... or company website"
              value={formData.applyUrl}
              onChangeText={(text) => setFormData({...formData, applyUrl: text})}
              keyboardType="url"
            />
          </View>

          {/* Contact Email */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Contact Email</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="hr@company.com"
              value={formData.contactEmail}
              onChangeText={(text) => setFormData({...formData, contactEmail: text})}
              keyboardType="email-address"
            />
          </View>

          {/* Application Deadline */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2">Application Deadline</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
              placeholder="e.g. 31st December 2024"
              value={formData.deadline}
              onChangeText={(text) => setFormData({...formData, deadline: text})}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />
      
      {/* Header */}
      <View className="bg-primary px-4 py-4" style={{ paddingTop: StatusBar.currentHeight + 10 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.openDrawer()}
              className="mr-4 p-2 rounded-lg bg-white/20"
            >
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-bold text-xl">Jobs Management</Text>
              <Text className="text-white/80 text-sm">{jobs.length} active jobs</Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-white/20 p-3 rounded-full"
          >
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs List */}
      <View className="flex-1">
        {jobs.length === 0 ? (
          <View className="flex-1 justify-center items-center px-4">
            <Icon name="briefcase-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg font-semibold mt-4 mb-2">No Jobs Posted</Text>
            <Text className="text-gray-400 text-center mb-6">
              Start by posting your first job opening
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">Post First Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        )}
      </View>

      {renderFormModal()}
    </View>
  );
};

export default AdminJobsScreen;
