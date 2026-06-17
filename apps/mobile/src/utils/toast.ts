import { Alert } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'info') {
  // Using Alert as a temporary solution for Expo environments
  // This can be replaced with react-native-toast-message later for more sophisticated toasts
  const title = type.charAt(0).toUpperCase() + type.slice(1);
  Alert.alert(title, message, [{ text: 'OK', onPress: () => {} }]);
}

export function showErrorToast(message: string) {
  showToast(message, 'error');
}

export function showSuccessToast(message: string) {
  showToast(message, 'success');
}

export function showInfoToast(message: string) {
  showToast(message, 'info');
}

export function showWarningToast(message: string) {
  showToast(message, 'warning');
}
