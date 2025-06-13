import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { db } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Job List Item Component
const JobListItem = ({ job, onViewDetails }) => (
  <TouchableOpacity
    className="bg-white rounded-2xl p-5 mb-4 shadow-lg border border-gray-100"
    activeOpacity={0.95}
  >
    {/* Header with Job Type Badge */}
    <View className="flex-row justify-between items-start mb-3">
      <View className="flex-1">
        <Text className="text-xl font-bold text-gray-900 mb-1">{job.title}</Text>
        <View className="flex-row items-center">
          <Text className="text-primary-dark font-semibold text-base">{job.company}</Text>
          <View className="w-1 h-1 bg-gray-400 rounded-full mx-2" />
          <Text className="text-gray-500 text-sm">{job.location}</Text>
        </View>
      </View>
      <View className={`px-3 py-1 rounded-full ${
        job.type === 'Full-time' ? 'bg-green-100' : 'bg-blue-100'
      }`}>
        <Text className={`text-xs font-semibold ${
          job.type === 'Full-time' ? 'text-green-700' : 'text-blue-700'
        }`}>
          {job.type}
        </Text>
      </View>
    </View>

    {/* Description */}
    <Text className="text-gray-600 text-sm mb-4 leading-5" numberOfLines={2}>
      {job.description}
    </Text>

    {/* Info Row */}
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center">
        <View className="bg-accent-yellow/10 px-3 py-1 rounded-lg mr-3">
          <Text className="text-gray-800 font-semibold text-sm">₹{job.salary}</Text>
        </View>
        <View className="bg-gray-100 px-3 py-1 rounded-lg">
          <Text className="text-gray-700 text-xs">⏰ {job.deadline}</Text>
        </View>
      </View>
      <Text className="text-gray-500 text-xs">Exp: {job.experience}</Text>
    </View>

    {/* Action Buttons */}
    <View className="flex-row justify-between items-center">
      <TouchableOpacity
        className="bg-primary rounded-xl px-6 py-3 flex-1 mr-3"
        onPress={() => Linking.openURL(job.applyUrl)}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-center">Apply Now</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => onViewDetails(job)}
        className="bg-gray-100 rounded-xl px-6 py-3"
        activeOpacity={0.7}
      >
        <Text className="text-primary font-semibold">Details</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// Enhanced Detail Modal
const JobDetailModal = ({ visible, job, onClose }) => {
  if (!job) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        
        {/* Modal Header */}
        <View className="bg-white px-6 py-4 shadow-sm border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Job Details</Text>
              <Text className="text-gray-500 text-sm">Complete information</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              className="bg-gray-100 rounded-full p-2"
              activeOpacity={0.7}
            >
              <Text className="text-primary text-lg font-semibold px-2">✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Job Header Card */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex-row items-start justify-between mb-4">
              <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center">
                <Text className="text-white font-bold text-2xl">
                  {job.company.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className={`px-4 py-2 rounded-full ${
                job.type === 'Full-time' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <Text className={`text-sm font-semibold ${
                  job.type === 'Full-time' ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {job.type}
                </Text>
              </View>
            </View>
            
            <Text className="text-2xl font-bold text-gray-900 mb-2">{job.title}</Text>
            <Text className="text-primary-dark font-semibold text-lg mb-1">{job.company}</Text>
            <Text className="text-gray-500">{job.location}</Text>
          </View>

          {/* Quick Info Cards */}
          <View className="flex-row justify-between mb-4">
            <InfoCard icon="💰" label="Salary" value={`₹${job.salary}`} />
            <InfoCard icon="⏰" label="Deadline" value={job.deadline} />
          </View>

          {/* Job Details */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <DetailSection title="Job Description" content={job.description} />
            <DetailSection title="Requirements" content={job.requirements} />
            <DetailSection title="Experience Required" content={job.experience} />
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            className="bg-primary rounded-2xl px-6 py-4 mb-6 shadow-lg"
            onPress={() => Linking.openURL(job.applyUrl)}
            activeOpacity={0.9}
          >
            <Text className="text-white font-bold text-center text-lg">
              Apply for this Position
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Info Card Component
const InfoCard = ({ icon, label, value }) => (
  <View className="bg-white rounded-xl p-4 flex-1 mx-1 shadow-sm border border-gray-100">
    <Text className="text-2xl mb-1">{icon}</Text>
    <Text className="text-gray-500 text-xs mb-1">{label}</Text>
    <Text className="text-gray-900 font-semibold text-sm">{value}</Text>
  </View>
);

// Detail Section Component
const DetailSection = ({ title, content }) => (
  <View className="mb-6">
    <Text className="text-gray-900 font-bold text-lg mb-3">{title}</Text>
    <Text className="text-gray-600 leading-6 text-base">{content}</Text>
  </View>
);

// Enhanced List Header
const JobListHeader = () => (
  <View className="px-6 pb-6">
    <View className="mb-4">
      <Text className="text-4xl font-bold text-gray-900 mb-2">
        Find Your Dream Job
      </Text>
      <Text className="text-gray-500 text-lg">
        Discover opportunities that match your skills
      </Text>
    </View>
    
    {/* Stats Cards */}
    <View className="flex-row justify-between mb-4">
      <View className="bg-primary/10 rounded-xl p-4 flex-1 mr-2">
        <Text className="text-primary-dark font-bold text-2xl">50+</Text>
        <Text className="text-primary-dark text-sm">Active Jobs</Text>
      </View>
      <View className="bg-accent-yellow/10 rounded-xl p-4 flex-1 ml-2">
        <Text className="text-gray-800 font-bold text-2xl">100+</Text>
        <Text className="text-gray-700 text-sm">Companies</Text>
      </View>
    </View>
  </View>
);

// Enhanced Loading Component
const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center bg-gray-50">
    <View className="bg-white rounded-2xl p-8 shadow-lg items-center">
      <ActivityIndicator size="large" color="#FF4500" />
      <Text className="text-gray-700 mt-4 font-semibold">Loading opportunities...</Text>
      <Text className="text-gray-500 text-sm mt-1">Finding the best jobs for you</Text>
    </View>
  </View>
);

// Main Screen Component
const JobsScreen = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'Jobs'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobsData = [];
      querySnapshot.forEach((doc) => {
        jobsData.push({ id: doc.id, ...doc.data() });
      });
      setJobs(jobsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setModalVisible(true);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobListItem job={item} onViewDetails={handleViewDetails} />
        )}
        ListHeaderComponent={<JobListHeader />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20 px-6">
            <View className="bg-white rounded-2xl p-8 shadow-lg items-center">
              <Text className="text-6xl mb-4">🔍</Text>
              <Text className="text-gray-800 text-xl font-bold mb-2">No Jobs Found</Text>
              <Text className="text-gray-500 text-center">
                We couldn't find any jobs matching your criteria. Try refreshing or check back later.
              </Text>
            </View>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />

      <JobDetailModal
        visible={modalVisible}
        job={selectedJob}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default JobsScreen;
