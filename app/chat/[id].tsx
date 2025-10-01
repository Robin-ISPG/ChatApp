import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage, demoChats, demoContacts } from '../../data/demoData';

export default function ChatScreen() {
  console.log('ChatScreen rendered');
  console.log("Paths.cache:",Paths.cache,"Paths.document.uri:",Paths.document.uri);
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  
  // Recording states - using exact Expo Audio pattern
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [showRecordingPreview, setShowRecordingPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>('');
  
  // Playback states
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [currentPlayingTime, setCurrentPlayingTime] = useState(0);
  
  // Audio visualization states
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Real audio level monitoring
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
  
  // Web audio states for Expo Go compatibility
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isWebRecording, setIsWebRecording] = useState(false);
  const [sharedAudioStream, setSharedAudioStream] = useState<MediaStream | null>(null);
  
  // Preview audio player
  const previewPlayer = useAudioPlayer(previewUri || null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  
  // Main audio player for voice messages
  const voicePlayer = useAudioPlayer(currentAudioUri || null);
  const voicePlayerStatus = useAudioPlayerStatus(voicePlayer);
  const currentPlayerRef = useRef(voicePlayer);
  
  // Update ref when player changes
  useEffect(() => {
    currentPlayerRef.current = voicePlayer;
  }, [voicePlayer]);

  // Track playing time for UI
  useEffect(() => {
    if (playingMessageId && voicePlayerStatus.isLoaded && voicePlayerStatus.playing) {
      setCurrentPlayingTime(voicePlayerStatus.currentTime);
    } else if (!playingMessageId) {
      setCurrentPlayingTime(0);
    }
  }, [voicePlayerStatus.currentTime, voicePlayerStatus.playing, voicePlayerStatus.isLoaded, playingMessageId]);

  // Helper function to safely play audio
  const safePlayAudio = async () => {
    try {
      const player = currentPlayerRef.current;
      if (player && voicePlayerStatus.isLoaded) {
        await player.play();
      }
    } catch (error) {
      console.error('Safe play error:', error);
      throw error;
    }
  };

  // Helper function to safely pause audio
  const safePauseAudio = async () => {
    try {
      const player = currentPlayerRef.current;
      if (player && voicePlayerStatus.isLoaded) {
        await player.pause();
      }
    } catch (error) {
      console.error('Safe pause error:', error);
    }
  };
  
  const contact = demoContacts.find(c => c.id === id);
  const initialChat = demoChats.find(c => c.contactId === id);

  useEffect(() => {
    if (initialChat) {
      setMessages(initialChat.messages);
    }
  }, [id, initialChat]);

  // Handle voice player status changes - only clear when audio finishes naturally
  useEffect(() => {
    if (voicePlayerStatus.isLoaded && !voicePlayerStatus.playing && playingMessageId && !isStartingPlayback && voicePlayerStatus.didJustFinish) {
      setPlayingMessageId(null);
      setCurrentAudioUri(null);
      
      // Reset audio mode back to recording mode
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    }
  }, [voicePlayerStatus.isLoaded, voicePlayerStatus.playing, playingMessageId, isStartingPlayback, voicePlayerStatus.didJustFinish]);

  // Auto-play when URI changes and player is ready
  useEffect(() => {
    if (currentAudioUri && voicePlayerStatus.isLoaded && playingMessageId && !voicePlayerStatus.playing) {
      const playAudio = async () => {
        try {
          setIsStartingPlayback(true);
          await safePlayAudio();
          setIsStartingPlayback(false);
        } catch (error) {
          console.error('Auto-play error:', error);
          setIsStartingPlayback(false);
          // If auto-play fails, clear the state
          setPlayingMessageId(null);
          setCurrentAudioUri(null);
        }
      };
      
      // Add a small delay to ensure player is fully ready
      setTimeout(playAudio, 100);
    }
  }, [currentAudioUri, voicePlayerStatus.isLoaded, playingMessageId, voicePlayerStatus.playing, isStartingPlayback]);

  // Stop audio when playingMessageId is cleared
  useEffect(() => {
    if (!playingMessageId && voicePlayerStatus.isLoaded && voicePlayerStatus.playing) {
      safePauseAudio();
    }
  }, [playingMessageId, voicePlayerStatus.isLoaded, voicePlayerStatus.playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (sharedAudioStream) {
        sharedAudioStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up Web Audio API resources
      if (Platform.OS === 'web') {
        if (microphone) {
          microphone.disconnect();
        }
        if (analyser) {
          analyser.disconnect();
        }
        if (audioContext) {
          audioContext.close();
        }
      }
    };
  }, [recordingInterval, audioStream, sharedAudioStream, microphone, analyser, audioContext]);

  // Initialize audio permissions and mode - exact pattern from Expo docs
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  // Web audio recording functions for Expo Go compatibility
  const startWebRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setSharedAudioStream(stream); // Share the same stream for audio levels
      
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setPreviewUri(audioUrl);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsWebRecording(true);
      setRecordingTime(0);
      setIsPaused(false);
      startAudioLevels();
    } catch (error) {
      console.error('Failed to start web recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please allow microphone access.');
    }
  };

  // Recording functions - proper expo-audio implementation
  const record = async () => {
    try {
      if (Platform.OS === 'web') {
        await startWebRecording();
        return;
      }
      
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setRecordingTime(0);
      setIsPaused(false);
      startAudioLevels();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const pauseRecording = async () => {
    try {
      if (Platform.OS === 'web' && mediaRecorder) {
        mediaRecorder.pause();
        setIsPaused(true);
        stopAudioLevels();
        return;
      }
      
      audioRecorder.pause();
      setIsPaused(true);
      stopAudioLevels();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      if (Platform.OS === 'web' && mediaRecorder) {
        mediaRecorder.resume();
        setIsPaused(false);
        startAudioLevels();
        return;
      }
      
      audioRecorder.record();
      setIsPaused(false);
      startAudioLevels();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };


  // Real audio level monitoring for web
  const startRealAudioLevels = async () => {
    if (Platform.OS !== 'web') return;
    
    try {
      // Use shared stream if available, otherwise create new one
      let stream = sharedAudioStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setSharedAudioStream(stream);
      }
      
      const context = new AudioContext();
      const analyserNode = context.createAnalyser();
      const microphoneNode = context.createMediaStreamSource(stream);
      
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      microphoneNode.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);
      setMicrophone(microphoneNode);
      
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      
      const updateLevels = () => {
        analyserNode.getByteFrequencyData(dataArray);
        
        // Convert frequency data to audio levels
        const levels: number[] = [];
        const chunkSize = Math.floor(dataArray.length / 20);
        
        for (let i = 0; i < 20; i++) {
          let sum = 0;
          for (let j = 0; j < chunkSize; j++) {
            sum += dataArray[i * chunkSize + j];
          }
          const average = sum / chunkSize;
          const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
          levels.push(Math.max(normalizedLevel, 0.1)); // Minimum height
        }
        
        setAudioLevels(levels);
        setRecordingTime(prev => prev + 0.1);
      };
      
      const interval = setInterval(updateLevels, 100);
      setRecordingInterval(interval);
      
    } catch (error) {
      console.error('Failed to start real audio levels:', error);
      // Fallback to simulation
      startSimulatedAudioLevels();
    }
  };

  // Simulated audio levels for native (more realistic)
  const startSimulatedAudioLevels = () => {
    if (recordingInterval) return;
    
    let baseLevel = 0.3;
    let trend = 1;
    
    const interval = setInterval(() => {
      setAudioLevels(prev => {
        const newLevels: number[] = [];
        
        for (let i = 0; i < 20; i++) {
          // Create more realistic patterns
          const variation = (Math.random() - 0.5) * 0.4;
          const positionFactor = Math.sin(i * 0.3) * 0.2;
          const level = Math.max(0.1, Math.min(1, baseLevel + variation + positionFactor));
          newLevels.push(level);
        }
        
        // Gradually change base level to simulate speech patterns
        baseLevel += trend * 0.05;
        if (baseLevel > 0.7 || baseLevel < 0.2) {
          trend *= -1;
        }
        
        return newLevels;
      });
      setRecordingTime(prev => prev + 0.1);
    }, 100);
    
    setRecordingInterval(interval);
  };

  // Start audio levels based on platform
  const startAudioLevels = () => {
    // Don't start if already running
    if (recordingInterval) return;
    
    if (Platform.OS === 'web') {
      startRealAudioLevels();
    } else {
      startSimulatedAudioLevels();
    }
  };

  const stopAudioLevels = () => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    // Clean up Web Audio API resources
    if (Platform.OS === 'web') {
      if (microphone) {
        microphone.disconnect();
        setMicrophone(null);
      }
      if (analyser) {
        analyser.disconnect();
        setAnalyser(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      // Don't close shared stream here - it might be used by recording
    }
    
    setAudioLevels([]);
  };

  const cancelRecording = async () => {
    try {
      if (Platform.OS === 'web' && mediaRecorder) {
        mediaRecorder.stop();
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
        if (sharedAudioStream) {
          sharedAudioStream.getTracks().forEach(track => track.stop());
          setSharedAudioStream(null);
        }
        setIsWebRecording(false);
        setShowRecordingPreview(false);
        setPreviewUri('');
        setIsPaused(false);
        setRecordingTime(0);
        stopAudioLevels();
        return;
      }
      
      await audioRecorder.stop();
      setShowRecordingPreview(false);
      setPreviewUri('');
      setIsPaused(false);
      setRecordingTime(0);
      stopAudioLevels();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const sendRecordingPreview = async () => {
    try {
      const duration = Math.floor((recorderState.durationMillis || 0) / 1000);
      
      if (!previewUri) {
        Alert.alert('Error', 'No recording file found');
        return;
      }
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Voice message (${formatTime(duration)})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true,
        type: 'voice',
        voiceDuration: duration,
        recordingUri: previewUri,
      };

      setMessages(prev => [...prev, newMessage]);
      setShowRecordingPreview(false);
      setPreviewUri('');
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to send recording:', error);
      Alert.alert('Error', 'Failed to send recording');
    }
  };

  const sendRecordingDirectly = async () => {
    try {
      if (Platform.OS === 'web' && mediaRecorder) {
        mediaRecorder.stop();
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
        if (sharedAudioStream) {
          sharedAudioStream.getTracks().forEach(track => track.stop());
          setSharedAudioStream(null);
        }
        setIsWebRecording(false);
        const duration = Math.floor(recordingTime);
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `Voice message (${formatTime(duration)})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: true,
          type: 'voice',
          voiceDuration: duration,
          recordingUri: previewUri,
        };

        setMessages(prev => [...prev, newMessage]);
        setRecordingTime(0);
        stopAudioLevels();
        return;
      }
      
      await audioRecorder.stop();
      
      // Wait a moment for the recording to be fully processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = Math.floor((recorderState.durationMillis || 0) / 1000);
      const recordingUri = audioRecorder.uri;
      
      
      if (!recordingUri) {
        Alert.alert('Error', 'No recording file was created');
        return;
      }
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Voice message (${formatTime(duration)})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true,
        type: 'voice',
        voiceDuration: duration,
        recordingUri: recordingUri,
      };

      setMessages(prev => [...prev, newMessage]);
      setRecordingTime(0);
      stopAudioLevels();
    } catch (error) {
      console.error('Failed to send recording:', error);
      Alert.alert('Error', 'Failed to send recording');
    }
  };

  const deleteRecordingPreview = async () => {
    setShowRecordingPreview(false);
    setPreviewUri('');
  };

  const playVoiceMessage = async (message: ChatMessage) => {
    try {
      if (playingMessageId === message.id) {
        // Stop current playback by clearing state
        setPlayingMessageId(null);
        setCurrentAudioUri(null);
        setIsStartingPlayback(false);
        setCurrentPlayingTime(0);
        return;
      }

      if (!message.recordingUri) {
        Alert.alert('Error', 'No audio file found');
        return;
      }
      
      // If switching to a different message, clear current state first
      if (playingMessageId && playingMessageId !== message.id) {
        setPlayingMessageId(null);
        setCurrentAudioUri(null);
        setIsStartingPlayback(false);
        setCurrentPlayingTime(0);
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Set audio mode for playback (critical for Android)
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false, // Important: set to false for playback
      });
      
      // Set the URI and playing state - let useEffect handle the rest
      setIsStartingPlayback(true);
      setPlayingMessageId(message.id);
      setCurrentAudioUri(message.recordingUri);
      
    } catch (error) {
      console.error('Failed to play voice message:', error);
      Alert.alert('Error', 'Failed to play voice message');
      setPlayingMessageId(null);
      setCurrentAudioUri(null);
      setIsStartingPlayback(false);
    }
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true,
        type: 'text',
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadPdfFile = async (fileUrl: string, fileName: string) => {
    console.log('📄 Download button clicked!');
    console.log('📁 File Name:', fileName);
    console.log('🔗 File URL:', fileUrl);

    // Validate inputs
    if (!fileUrl || !fileName) {
      Alert.alert('Error', 'Invalid file URL or filename');
      return;
    }

    // Mark file as downloaded
    setDownloadedFiles(prev => new Set(prev).add(fileUrl));

    try {
      if (Platform.OS === 'web') {
        // For web, open the file in a new tab
        console.log('🌐 Opening file in browser...');
        await WebBrowser.openBrowserAsync(fileUrl);
        console.log('✅ File opened in browser!');
      } else {
        console.log('⬇️ Starting download...');

      }
    } catch (downloadError) {
      console.error('❌ Download failed:', downloadError);
      throw downloadError;
    }
      // Remove from downloadedFiles if it failed
      setDownloadedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
      
  };

  const openDownloadedFile = async (fileUrl: string, fileName: string) => {
    console.log('📂 Opening downloaded file:', fileName);
    
    try {
      // Check if file exists in Chat App folder
      const chatAppDirectory = new Directory(Paths.cache.uri + 'Chat App');
      const file = new File(chatAppDirectory, fileName);
      
      
      // File should exist since we're using the API consistently
      
      if (Platform.OS === 'android') {
        try {
          const contentUri = await getContentUriAsync(file.uri);
          console.log('📎 Content URI:', contentUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf'
          });
          console.log('✅ Intent opened successfully');
        } catch (intentError) {
          console.error('❌ Failed to open file with intent:', intentError);
          
          Alert.alert(
            'Cannot Open File',
            `Unable to open ${fileName}. File saved to Chat App folder.`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        // For iOS, let user know file location
        Alert.alert('File Ready!', `${fileName} is saved in Chat App folder.`, [{ text: 'OK', style: 'default' }]);
      }
    } catch (error) {
      console.error('❌ Failed to open file:', error);
      
      // If it's a file system issue, restore download button
      console.log('🔄 File system issue detected, restoring download button');
      setDownloadedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
      Alert.alert('Cannot Access File', 'The file cannot be accessed. Please download it again.');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.otherBubble
      ]}>
        {item.type === 'voice' ? (
           <View style={styles.voiceMessageContainer}>
             <TouchableOpacity 
               style={styles.voicePlayButton}
               onPress={() => playVoiceMessage(item)}
             >
               <Ionicons 
                 name={playingMessageId === item.id ? "pause" : "play"} 
                 size={20} 
                 color={item.isUser ? '#ffffff' : '#007AFF'} 
               />
             </TouchableOpacity>
             
             <View style={styles.voicePlayerContainer}>
               <View style={styles.voiceProgressContainer}>
                <View style={styles.progressBarWrapper}>
                  <View style={[
                    styles.voiceProgressBar,
                    { backgroundColor: item.isUser ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)' }
                  ]}>
                     <View 
                       style={[
                         styles.voiceProgressFill,
                         { 
                           width: playingMessageId === item.id
                             ? `${(currentPlayingTime / (item.voiceDuration || 1)) * 100}%`
                             : '0%',
                           backgroundColor: item.isUser ? '#ffffff' : '#007AFF'
                         }
                       ]} 
                     />
                  </View>
                  
                  <Text style={[
                    styles.totalDuration,
                    item.isUser ? styles.userMessageTime : styles.otherMessageTime
                  ]}>
                    {formatTime(item.voiceDuration || 0)}
                  </Text>
                </View>
                
                {playingMessageId === item.id && (
                  <Text style={[
                    styles.currentTime,
                    item.isUser ? styles.userMessageTime : styles.otherMessageTime
                  ]}>
                    {formatTime(Math.floor(currentPlayingTime))}
                  </Text>
                )}
               </View>
               
               <View style={styles.voiceWaveform}>
                {playingMessageId === item.id ? (
                  <View style={[styles.playingIndicator, { opacity: voicePlayerStatus.playing ? 1 : 0.7 }]}>
                    <View style={[styles.waveBar, { height: 8 }]} />
                    <View style={[styles.waveBar, { height: 12 }]} />
                    <View style={[styles.waveBar, { height: 6 }]} />
                    <View style={[styles.waveBar, { height: 10 }]} />
                    <View style={[styles.waveBar, { height: 8 }]} />
                    <View style={[styles.waveBar, { height: 14 }]} />
                    <View style={[styles.waveBar, { height: 7 }]} />
                    <View style={[styles.waveBar, { height: 9 }]} />
                  </View>
                ) : (
                  <View style={styles.idleIndicator}>
                    <View style={[styles.waveBar, { height: 4 }]} />
                    <View style={[styles.waveBar, { height: 6 }]} />
                    <View style={[styles.waveBar, { height: 4 }]} />
                    <View style={[styles.waveBar, { height: 5 }]} />
                    <View style={[styles.waveBar, { height: 3 }]} />
                    <View style={[styles.waveBar, { height: 6 }]} />
                    <View style={[styles.waveBar, { height: 4 }]} />
                    <View style={[styles.waveBar, { height: 5 }]} />
                  </View>
                )}
               </View>
             </View>
           </View>
        ) : item.type === 'pdf' ? (
          <View style={styles.pdfMessageContainer}>
            <View style={styles.pdfIconContainer}>
              <Ionicons 
                name="document-text" 
                size={24} 
                color={item.isUser ? '#ffffff' : '#007AFF'} 
              />
              <View style={styles.pdfLabel}>
                <Text style={[styles.pdfLabelText, { color: item.isUser ? '#ffffff' : '#007AFF' }]}>PDF</Text>
              </View>
            </View>
            {downloadedFiles.has(item.fileUrl || '') ? (
              <TouchableOpacity 
                style={styles.pdfFileNameContainer}
                onPress={() => item.fileUrl && item.fileName && openDownloadedFile(item.fileUrl, item.fileName)}
              >
                <Text style={[
                  styles.pdfFileName,
                  styles.clickableFileName,
                  item.isUser ? styles.userMessageText : styles.otherMessageText
                ]}>
                  {item.fileName}
                </Text>
                <Ionicons 
                  name="open-outline" 
                  size={16} 
                  color={item.isUser ? '#ffffff' : '#007AFF'} 
                />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.pdfFileNameContainer}>
                  <Text style={[
                    styles.pdfFileName,
                    item.isUser ? styles.userMessageText : styles.otherMessageText
                  ]}>
                    {item.fileName}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.pdfDownloadButton}
                  onPress={() => item.fileUrl && item.fileName && downloadPdfFile(item.fileUrl, item.fileName)}
                >
                  <Ionicons 
                    name="arrow-down-outline" 
                    size={16} 
                    color={item.isUser ? '#ffffff' : '#007AFF'} 
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <Text style={[
            styles.messageText,
            item.isUser ? styles.userMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
        )}
        <Text style={[
          styles.messageTime,
          item.isUser ? styles.userMessageTime : styles.otherMessageTime
        ]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Contact not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.contactInfo}>
          <Text style={styles.avatar}>{contact.avatar}</Text>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.name}: Download </Text>
            <Text style={styles.contactStatus}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="videocam-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {(recorderState.isRecording || isWebRecording) ? (
        <View style={styles.recordingInterface}>
          <View style={styles.recordingTopBar}>
            <View style={styles.recordingDuration}>
              <Text style={styles.recordingTimeText}>
                {formatTime(isWebRecording ? recordingTime : (recorderState.durationMillis || 0) / 1000)}
              </Text>
            </View>
            
            <View style={styles.recordingWaveform}>
              <View style={styles.waveBars}>
                {audioLevels.length > 0 ? audioLevels.map((level, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.waveBar, 
                      { 
                        height: 4 + level * 16,
                        backgroundColor: level > 0.6 ? '#ff3b30' : '#007AFF',
                        opacity: level > 0.3 ? 1 : 0.6
                      }
                    ]} 
                  />
                )) : Array.from({ length: 8 }, (_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.waveBar, 
                      { 
                        height: 4,
                        backgroundColor: '#cccccc',
                        opacity: 0.5
                      }
                    ]} 
                  />
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.recordingBottomBar}>
            <TouchableOpacity style={styles.deleteButton} onPress={cancelRecording}>
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.pauseButton} 
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={24} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sendRecordingButton} onPress={sendRecordingDirectly}>
              <Ionicons name="send" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : showRecordingPreview ? (
        <View style={styles.recordingPreviewInterface}>
          <View style={styles.previewDuration}>
            <Text style={styles.previewTimeText}>
              {previewStatus.playing ? formatTime(previewStatus.currentTime) : formatTime((recorderState.durationMillis || 0) / 1000)}
            </Text>
          </View>
          
          <View style={styles.previewWaveform}>
            <TouchableOpacity 
              style={styles.previewPlayButton}
              onPress={() => {
                if (previewStatus.playing) {
                  previewPlayer.pause();
                } else {
                  previewPlayer.play();
                }
              }}
            >
              <Ionicons 
                name={previewStatus.playing ? "pause" : "play"} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            <View style={styles.previewWaveBars}>
              <View style={[styles.waveBar, { height: 6 }]} />
              <View style={[styles.waveBar, { height: 8 }]} />
              <View style={[styles.waveBar, { height: 4 }]} />
              <View style={[styles.waveBar, { height: 7 }]} />
              <View style={[styles.waveBar, { height: 5 }]} />
              <View style={[styles.waveBar, { height: 9 }]} />
              <View style={[styles.waveBar, { height: 6 }]} />
              <View style={[styles.waveBar, { height: 8 }]} />
            </View>
          </View>
          
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.previewDeleteButton} onPress={deleteRecordingPreview}>
              <Ionicons name="trash" size={24} color="#ff3b30" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewSendButton} onPress={sendRecordingPreview}>
              <Ionicons name="send" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {/* text input */}
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              multiline
              maxLength={1000}
            />
            {/* voice button */}
            <TouchableOpacity
              style={styles.voiceButton}
              onPressIn={record}
            >
              <Ionicons name="mic" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          {/* send button */}
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    marginRight: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    fontSize: 24,
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  contactStatus: {
    fontSize: 12,
    color: '#666666',
  },
  headerAction: {
    marginLeft: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
   messageBubble: {
     maxWidth: '80%',
     paddingHorizontal: 16,
     paddingVertical: 12,
     borderRadius: 20,
     position: 'relative',
     overflow: 'hidden',
   },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#666666',
  },
   voiceMessageContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     minHeight: 48,
     width: '100%',
     overflow: 'hidden',
   },
  voicePlayerContainer: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceMessageInfo: {
    flex: 1,
  },
  voiceMessageText: {
    fontSize: 16,
    fontWeight: '500',
  },
   voiceDuration: {
     fontSize: 12,
     width: 45,
     textAlign: 'right',
     fontWeight: '500',
   },
   voiceProgressContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   progressBarWrapper: {
     flex: 1,
     position: 'relative',
   },
   voiceProgressBar: {
     height: 4,
     borderRadius: 2,
     overflow: 'hidden',
     width: '100%',
     marginBottom: 2,
     marginTop: 6,
   },
  voiceProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  totalDuration: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  currentTime: {
    fontSize: 12,
    fontWeight: '600',
    width: 25,
    textAlign: 'center',
    marginRight: 4,
  },
  voiceWaveform: {
    width: 40,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    gap: 2,
  },
  idleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    opacity: 0.5,
    gap: 2,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    minHeight: 4,
    maxHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 20,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  recordingInterface: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  recordingTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDuration: {
    marginRight: 16,
  },
  recordingTimeText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingWaveform: {
    flex: 1,
    alignItems: 'center',
    marginRight: 16,
  },
  waveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 2,
  },
  recordingSpeed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  recordingBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTimer: {
    flex: 1,
    alignItems: 'center',
  },
  timerText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  sendRecordingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingPreviewInterface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  previewDuration: {
    marginRight: 12,
  },
  previewTimeText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  previewWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  previewPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewWaveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    opacity: 0.7,
    gap: 2,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 16,
  },
  pdfMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    width: '100%',
  },
  pdfIconContainer: {
    position: 'relative',
    marginRight: 6,
    marginLeft: 2,
  },
  pdfLabel: {
    position: 'absolute',
    bottom: -14,
    right: -15,
    width: 40,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pdfLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pdfFileNameContainer: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  pdfFileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  clickableFileName: {
    textDecorationLine: 'underline',
  },
  pdfDownloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});