import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LanguageSwitcher = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' }
  ];

  const changeLanguage = async (languageCode) => {
    await i18n.changeLanguage(languageCode);
    setModalVisible(false);
  };

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="translate" size={24} color="#689F38" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('change_language')}</Text>
            
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageButton,
                    i18n.language === item.code && styles.selectedLanguage
                  ]}
                  onPress={() => changeLanguage(item.code)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.languageName}>{item.nativeName}</Text>
                  {i18n.language === item.code && (
                    <Icon name="check" size={20} color="#689F38" />
                  )}
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({      
    buttonContainer: {
        position: 'absolute',
        right: 15,
        zIndex: 1000
    },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 50,
    margin: 10,
    width: 45,
  },
  buttonText: {
    marginLeft: 8,
    color: '#333',
    fontSize: 16
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '80%',
    maxHeight: '60%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedLanguage: {
    backgroundColor: '#f0f8f0'
  },
  flag: {
    fontSize: 24,
    marginRight: 15
  },
  languageName: {
    fontSize: 16,
    flex: 1
  },
  closeButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#689F38',
    borderRadius: 8,
    alignItems: 'center'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default LanguageSwitcher;
