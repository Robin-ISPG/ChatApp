import ChatsScreen from '@/components/custom/ChatsScreen';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>ISPG Chat</ThemedText>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="add-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <ChatsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerButton: {
    padding: 4,
  },
});
