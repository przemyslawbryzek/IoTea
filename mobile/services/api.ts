import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tea } from './interfaces/tea.interface';
import { DeviceStatus, RegisterDeviceResponse } from './interfaces/device.interface';
import { BrewSummary } from './interfaces/brew.interface';
import { LoginResponse } from './interfaces/login.interface';
import {
  MyTeaDetail,
  MyTeaFormValues,
  MyTeaInstruction,
  MyTeaInstructionFormValues,
  MyTeaSummary,
} from './interfaces/mytea.interface';
 
const API_URL = 'http://192.168.18.101:30080/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token } = response.data;
          await AsyncStorage.setItem('access_token', access_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
      }
    }
    
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', { email, password });
  if (response.data.access_token) {
    await AsyncStorage.setItem('access_token', response.data.access_token);
    if (response.data.refresh_token) {
      await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
    }
  }
  return response.data;
};

export const register = async (email: string, password: string, name: string): Promise<any> => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data;
};

export const registerDevice = async (name: string, model?: string): Promise<RegisterDeviceResponse> => {
  const response: AxiosResponse<RegisterDeviceResponse> = await api.post('/auth/device/register', { name, model });
  return response.data;
};

export const getTeas = async (): Promise<Tea[]> => {
  const response: AxiosResponse<Tea[]> = await api.get('/tea');
  return response.data;
};

export const getTeaById = async (teaId: number): Promise<Tea & {
  instructions?: Array<{
    id: number;
    style: { name: string };
    grams_per_100ml: number;
    first_infusion_seconds: number;
    increment_seconds: number;
    max_infusions: number;
  }>;
}> => {
  const response = await api.get(`/tea/${teaId}`);
  return response.data;
};

export const getTeaCategories = async (): Promise<Array<{ id: number; name: string; icon_url: string | null }>> => {
  const response = await api.get('/tea/category');
  return response.data;
};

export const getMyTeas = async (): Promise<MyTeaSummary[]> => {
  const response = await api.get('/mytea');
  return response.data;
};

export const getMyTeaById = async (teaId: number): Promise<MyTeaDetail> => {
  const response = await api.get(`/mytea/${teaId}`);
  return response.data;
};

export const createMyTea = async (body: MyTeaFormValues): Promise<MyTeaSummary> => {
  const response = await api.post('/mytea', body);
  return response.data;
};

export const updateMyTea = async (teaId: number, body: MyTeaFormValues): Promise<MyTeaSummary> => {
  const response = await api.put(`/mytea/${teaId}`, body);
  return response.data;
};

export const deleteMyTea = async (teaId: number): Promise<{ message: string }> => {
  const response = await api.delete(`/mytea/${teaId}`);
  return response.data;
};

export const getBrewingStyles = async (): Promise<Array<{ id: number; name: string; description: string | null }>> => {
  const response = await api.get('/mytea/styles');
  return response.data;
};

export const createMyTeaInstruction = async (
  teaId: number,
  body: MyTeaInstructionFormValues,
): Promise<MyTeaInstruction> => {
  const response = await api.post(`/mytea/${teaId}/instructions`, body);
  return response.data;
};

export const updateMyTeaInstruction = async (
  teaId: number,
  instructionId: number,
  body: MyTeaInstructionFormValues,
): Promise<MyTeaInstruction> => {
  const response = await api.put(`/mytea/${teaId}/instructions/${instructionId}`, body);
  return response.data;
};

export const deleteMyTeaInstruction = async (
  teaId: number,
  instructionId: number,
): Promise<{ message: string }> => {
  const response = await api.delete(`/mytea/${teaId}/instructions/${instructionId}`);
  return response.data;
};

export const getDevices = async (): Promise<Array<{
  id: number;
  name: string;
  model: string | null;
  firmware_version: string | null;
  last_seen: string | null;
  created_at: string;
  online: boolean;
  currentTemp: number | null;
  currentTempUpdatedAt: string | null;
}>> => {
  const response = await api.get('/devices');
  return response.data;
};

export const getDeviceStatus = async (deviceId: number): Promise<DeviceStatus> => {
  const response: AxiosResponse<DeviceStatus> = await api.get(`/devices/${deviceId}/status`);
  return response.data;
};

export const getBrews = async (): Promise<BrewSummary[]> => {
  const response: AxiosResponse<BrewSummary[]> = await api.get('/brews');
  return response.data;
};

export const startBrew = async (brewData: {
  deviceId: number;
  instructionId: number;
  volumeMl: number;
  brewNumber: number;
}): Promise<{ id: number }> => {
  const response = await api.post('/brews/start', brewData);
  return response.data;
};
