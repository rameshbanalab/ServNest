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
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

const AdminJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Date picker states
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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

  const jobTypes = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
  const jobTypeColors = {
    'Full-time': { bg: 'bg-green-100', text: 'text-green-700' },
    'Part-time': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'Contract': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Internship': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'Remote': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  };

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, filterType]);

  const setupRealtimeListener = () => {
    const jobsQuery = query(
      collection(db, 'Jobs'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching jobs:', error);
      setLoading(false);
    });

    return unsubscribe;
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'All') {
      filtered = filtered.filter(job => job.type === filterType);
    }

    setFilteredJobs(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleDateConfirm = (date) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      deadline: formatDate(date)
    });
    setDatePickerOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.company || !formData.applyUrl) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Title, Company, Apply URL)');
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
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job. Please try again.');
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
    
    if (job.deadline) {
      try {
        const parsedDate = new Date(job.deadline);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
      } catch (error) {
        console.log('Could not parse existing deadline date');
      }
    }
    
    setModalVisible(true);
  };

  const handleDelete = (jobId, jobTitle) => {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Jobs', jobId));
              Alert.alert('Success', 'Job deleted successfully');
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const toggleJobStatus = async (job) => {
    try {
      await updateDoc(doc(db, 'Jobs', job.id), {
        isActive: !job.isActive,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update job status');
    }
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
    setSelectedDate(new Date());
    setEditingJob(null);
  };

  const FormField = ({ label, required, isDateField, ...props }) => {
    if (isDateField) {
      return (
        <View className="mb-6">
          <Text className="text-gray-700 font-semibold mb-2">
            {label} {required && <Text className="text-red-500">*</Text>}
          </Text>
          <TouchableOpacity
            onPress={() => setDatePickerOpen(true)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <Text className={`text-gray-700 ${!formData.deadline ? 'opacity-50' : ''}`}>
              {formData.deadline || 'Select deadline date'}
            </Text>
            <Icon name="calendar" size={20} color="#FF4500" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">
          {label} {required && <Text className="text-red-500">*</Text>}
        </Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700"
          textAlignVertical={props.multiline ? "top" : "center"}
          {...props}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <View className="bg-white px-6 py-4 border-b border-gray-200">
      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
        <Icon name="magnify" size={20} color="#6B7280" />
        <TextInput
          className="flex-1 ml-3 text-gray-700"
          placeholder="Search jobs, companies, locations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-3">
          {jobTypes.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              className={`px-4 py-2 rounded-full border ${
                filterType === type 
                  ? 'bg-primary border-primary' 
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`font-medium ${
                filterType === type ? 'text-white' : 'text-gray-700'
              }`}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Stats */}
      <View className="flex-row justify-between mt-4">
        <View className="bg-primary/10 rounded-xl p-3 flex-1 mr-2">
          <Text className="text-primary-dark font-bold text-lg">{jobs.length}</Text>
          <Text className="text-primary-dark text-sm">Total Jobs</Text>
        </View>
        <View className="bg-green-100 rounded-xl p-3 flex-1 mx-1">
          <Text className="text-green-700 font-bold text-lg">
            {jobs.filter(job => job.isActive).length}
          </Text>
          <Text className="text-green-700 text-sm">Active</Text>
        </View>
        <View className="bg-gray-100 rounded-xl p-3 flex-1 ml-2">
          <Text className="text-gray-700 font-bold text-lg">
            {jobs.filter(job => !job.isActive).length}
          </Text>
          <Text className="text-gray-700 text-sm">Inactive</Text>
        </View>
      </View>
    </View>
  );

  const renderJobItem = ({ item }) => {
    const typeStyle = jobTypeColors[item.type] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    
    return (
      <View className="bg-white rounded-2xl p-5 mb-4 mx-4 shadow-lg border border-gray-100">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
                {item.title}
              </Text>
              <View className={`px-3 py-1 rounded-full ${typeStyle.bg}`}>
                <Text className={`text-xs font-semibold ${typeStyle.text}`}>
                  {item.type}
                </Text>
              </View>
            </View>
            <Text className="text-primary-dark font-semibold text-base">{item.company}</Text>
          </View>
        </View>

        {/* Job Details */}
        <View className="space-y-2 mb-4">
          <View className="flex-row items-center">
            <Icon name="map-marker" size={16} color="#FF4500" />
            <Text className="text-gray-600 text-sm ml-2">{item.location}</Text>
          </View>
          <View className="flex-row items-center">
            <Icon name="currency-usd" size={16} color="#FF4500" />
            <Text className="text-gray-600 text-sm ml-2">₹{item.salary}</Text>
          </View>
          <View className="flex-row items-center">
            <Icon name="clock-outline" size={16} color="#FF4500" />
            <Text className="text-gray-600 text-sm ml-2">Deadline: {item.deadline}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View className="flex-row items-center justify-between mb-4">
          <View className={`px-3 py-1 rounded-full ${
            item.isActive ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Text className={`text-xs font-medium ${
              item.isActive ? 'text-green-700' : 'text-red-700'
            }`}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text className="text-gray-400 text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => toggleJobStatus(item)}
            className={`flex-1 py-3 rounded-xl ${
              item.isActive ? 'bg-red-100' : 'bg-green-100'
            }`}
          >
            <Text className={`text-center font-semibold ${
              item.isActive ? 'text-red-700' : 'text-green-700'
            }`}>
              {item.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            className="bg-primary/10 p-3 rounded-xl"
          >
            <Icon name="pencil" size={18} color="#FF4500" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.title)}
            className="bg-red-100 p-3 rounded-xl"
          >
            <Icon name="delete" size={18} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setModalVisible(false)}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#FF4500" />
        
        {/* Modal Header */}
        <View className="bg-primary px-6 py-4">
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
            <View className="flex-1 mx-4">
              <Text className="text-white font-bold text-xl text-center">
                {editingJob ? 'Edit Job' : 'Post New Job'}
              </Text>
              <Text className="text-white/80 text-sm text-center">
                {editingJob ? 'Update job details' : 'Create a new job posting'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-white/20 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-bold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          <FormField
            label="Job Title"
            required
            placeholder="e.g. Senior React Native Developer"
            value={formData.title}
            onChangeText={(text) => setFormData({...formData, title: text})}
          />

          <FormField
            label="Company"
            required
            placeholder="Company name"
            value={formData.company}
            onChangeText={(text) => setFormData({...formData, company: text})}
          />

          <FormField
            label="Location"
            placeholder="e.g. Mumbai, India"
            value={formData.location}
            onChangeText={(text) => setFormData({...formData, location: text})}
          />

          {/* Job Type Selection */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-3">Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {jobTypes.slice(1).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({...formData, type})}
                    className={`px-4 py-3 rounded-xl border ${
                      formData.type === type 
                        ? 'bg-primary border-primary' 
                        : 'bg-white border-gray-300'
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

          <FormField
            label="Experience Required"
            placeholder="e.g. 2-5 years"
            value={formData.experience}
            onChangeText={(text) => setFormData({...formData, experience: text})}
          />

          <FormField
            label="Salary Range"
            placeholder="e.g. 5-8 LPA"
            value={formData.salary}
            onChangeText={(text) => setFormData({...formData, salary: text})}
          />

          <FormField
            label="Job Description"
            placeholder="Describe the role and responsibilities..."
            value={formData.description}
            onChangeText={(text) => setFormData({...formData, description: text})}
            multiline
            numberOfLines={4}
          />

          <FormField
            label="Requirements"
            placeholder="List the required skills and qualifications..."
            value={formData.requirements}
            onChangeText={(text) => setFormData({...formData, requirements: text})}
            multiline
            numberOfLines={4}
          />

          <FormField
            label="Application URL"
            required
            placeholder="https://forms.google.com/... or company website"
            value={formData.applyUrl}
            onChangeText={(text) => setFormData({...formData, applyUrl: text})}
            keyboardType="url"
          />

          <FormField
            label="Contact Email"
            placeholder="hr@company.com"
            value={formData.contactEmail}
            onChangeText={(text) => setFormData({...formData, contactEmail: text})}
            keyboardType="email-address"
          />

          {/* Date Picker Field */}
          <FormField
            label="Application Deadline"
            required
            isDateField={true}
          />

          {/* Additional deadline info */}
          {formData.deadline && (
            <View className="mb-6 bg-primary/5 p-4 rounded-xl border border-primary/20">
              <View className="flex-row items-center">
                <Icon name="information" size={20} color="#FF4500" />
                <Text className="text-primary-dark font-medium ml-2">
                  Applications close on {formData.deadline}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Date Picker Modal */}
        <DatePicker
          modal
          open={datePickerOpen}
          date={selectedDate}
          mode="date"
          minimumDate={new Date()}
          title="Select Application Deadline"
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerOpen(false)}
          theme="light"
        />
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-4 text-gray-600 font-semibold">Loading jobs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#FF4500" />
      
      {/* Top Navigation */}
      <View className="bg-primary px-6 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.openDrawer()}
              className="mr-4 p-2 rounded-lg bg-white/20"
            >
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-bold text-2xl">Jobs Management</Text>
              <Text className="text-white/80 text-sm">
                {filteredJobs.length} of {jobs.length} jobs shown
              </Text>
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
      <FlatList
        data={filteredJobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center px-6 py-20">
            <Icon name="briefcase-search-outline" size={80} color="#D1D5DB" />
            <Text className="text-gray-400 text-xl font-semibold mt-4 mb-2">
              {searchQuery || filterType !== 'All' ? 'No matching jobs' : 'No jobs posted yet'}
            </Text>
            <Text className="text-gray-400 text-center mb-6">
              {searchQuery || filterType !== 'All' 
                ? 'Try adjusting your search or filters' 
                : 'Start by posting your first job opening'
              }
            </Text>
            {!searchQuery && filterType === 'All' && (
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-primary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Post First Job</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FF4500"]}
            tintColor="#FF4500"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {renderFormModal()}
    </SafeAreaView>
  );
};

export default AdminJobsScreen;
