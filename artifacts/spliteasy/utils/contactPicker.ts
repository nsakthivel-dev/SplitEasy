import * as Contacts from 'expo-contacts';
import { Alert, Linking, Platform } from 'react-native';

export interface ContactInfo {
  name: string;
  phoneNumber: string | null;
  avatarUri: string | null;
}

/**
 * Request contacts permission from the user
 */
export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  
  if (status === 'denied') {
    Alert.alert(
      'Permission Required',
      'SplitEasy needs access to your contacts to help you quickly add members to your group. ' +
      'This information is only used to fill in member names and is not shared anywhere.\n\n' +
      'Please enable contacts permission in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
    return false;
  }
  
  return status === 'granted';
}

/**
 * Open the native contact picker and return selected contact info
 */
export async function pickContact(): Promise<ContactInfo | null> {
  try {
    // Request permission first
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      return null;
    }

    // Open contact picker (v55 API doesn't take arguments)
    const contact = await Contacts.presentContactPickerAsync();

    if (!contact) {
      return null; // User cancelled
    }

    // Extract name
    let name = contact.name || '';
    if (!name && contact.firstName) {
      name = `${contact.firstName} ${contact.lastName || ''}`.trim();
    }
    
    // Fall back to phone number if no name
    const phoneNumbers = contact.phoneNumbers || [];
    const phoneNumber = phoneNumbers.length > 0 ? phoneNumbers[0].number || null : null;
    
    if (!name && phoneNumber) {
      name = phoneNumber;
    }

    // Extract avatar URI (v55 API uses different property names)
    const avatarUri = (contact as any).imageUri || (contact as any).thumbnailUri || null;

    return {
      name: name || 'Unknown Contact',
      phoneNumber,
      avatarUri,
    };
  } catch (error) {
    console.error('Error picking contact:', error);
    Alert.alert('Error', 'Failed to pick contact. Please try again.');
    return null;
  }
}
