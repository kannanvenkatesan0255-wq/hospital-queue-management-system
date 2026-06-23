/**
2035 Futuristic Vocal Announcement System
     Uses Web Speech Synthesis API to announce token call events.
 */

export interface VoiceSettingsConfig {
  enabled: boolean;
  language: 'en' | 'ta';
  volume: number; // 0 to 1
  rate: number;   // 0.5 to 2
  pitch: number;  // 0.5 to 2
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettingsConfig = {
  enabled: true,
  language: 'en',
  volume: 1.0,
  rate: 0.9,
  pitch: 1.1, // slightly higher pitch for clinical crispness
};

export function getStoredVoiceSettings(): VoiceSettingsConfig {
  try {
    const saved = localStorage.getItem('qc_voice_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Could not load voice settings, fallback to default:', e);
  }
  return { ...DEFAULT_VOICE_SETTINGS };
}

export function saveVoiceSettings(settings: VoiceSettingsConfig) {
  try {
    localStorage.setItem('qc_voice_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Could not save voice settings:', e);
  }
}

// Speaks the token announcement
export function announceTokenEvent(tokenNumber: string, doctorName: string, room: string) {
  const settings = getStoredVoiceSettings();
  if (!settings.enabled) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Browser speech synthesis is not supported on this vehicle.');
    return;
  }

  // Cancel any currently active speak streams to prioritize this urgent announcement
  window.speechSynthesis.cancel();

  const cleanRoom = room || 'Consultation Cabin';
  const cleanDoc = doctorName ? doctorName.replace('Dr. ', 'Doctor ') : 'Your assigned doctor';

  let voiceText = '';
  if (settings.language === 'ta') {
    // Tamil Announcement
    // e.g., "டோக்கன் A-014, தயவுசெய்து டாக்டர் ஆரோன் பட்டேல் ரூம் 102 க்கு செல்லவும்."
    voiceText = `டோக்கன் ${tokenNumber}, தயவுசெய்து ${cleanDoc}, ${cleanRoom} க்கு செல்லவும்.`;
  } else {
    // English Announcement
    // e.g., "Token A-014, please proceed to Doctor Aaron Patel in Room 102."
    voiceText = `Token ${tokenNumber}. Please proceed immediately to ${cleanDoc} in ${cleanRoom}.`;
  }

  const utterance = new SpeechSynthesisUtterance(voiceText);
  utterance.volume = settings.volume;
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;

  // Attempt to select an appropriate voice
  const voices = window.speechSynthesis.getVoices();
  let foundVoice: SpeechSynthesisVoice | null = null;

  if (settings.language === 'ta') {
    // Look for Tamil voice (ta-IN or ta)
    foundVoice = voices.find(v => v.lang.startsWith('ta')) || null;
  } else {
    // Look for a premium English voice (en-US, en-GB, google us/uk)
    foundVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                 voices.find(v => v.lang.startsWith('en')) || null;
  }

  if (foundVoice) {
    utterance.voice = foundVoice;
  } else if (voices.length > 0) {
    // Fallback to first available language matched voice or default
    utterance.lang = settings.language === 'ta' ? 'ta-IN' : 'en-US';
  }

  window.speechSynthesis.speak(utterance);
}
