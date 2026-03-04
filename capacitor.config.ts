import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1d15659a8b3b4e729e6511ab79117ace',
  appName: 'CampusPerk',
  webDir: 'dist',
  server: {
    url: 'https://1d15659a-8b3b-4e72-9e65-11ab79117ace.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
