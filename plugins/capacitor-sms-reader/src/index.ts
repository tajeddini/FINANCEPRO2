import type { PluginListenerHandle } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

export interface SmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
  threadId?: number;
  type?: string;
}

export interface ReadSmsOptions {
  timestamp?: string;
  pageSize?: number;
}

export interface ReadSmsResult {
  value: SmsMessage[];
}

export interface PermissionResult {
  value: 'granted' | 'denied' | 'permanently_denied' | 'unknown';
}

export interface ReadSMSPlugin {
  requestPermission(): Promise<PermissionResult>;
  checkPermission(): Promise<PermissionResult>;
  openAppSettings(): Promise<void>;
  getSMS(options?: ReadSmsOptions): Promise<ReadSmsResult>;
  addListener(eventName: 'smsReceived', listener: (event: { value: SmsMessage }) => void): Promise<PluginListenerHandle>;
}

const ReadSMS = registerPlugin<ReadSMSPlugin>('ReadSMS', {
  web: () => ({
    async requestPermission() {
      return { value: 'denied' };
    },
    async checkPermission() {
      return { value: 'denied' };
    },
    async openAppSettings() {
      return;
    },
    async getSMS() {
      return { value: [] };
    },
    async addListener() {
      return { remove: async () => undefined } as unknown as PluginListenerHandle;
    },
  }),
});

export { ReadSMS };
