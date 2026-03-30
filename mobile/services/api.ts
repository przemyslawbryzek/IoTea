import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tea, TeaCategory } from './interfaces/tea.interface';
import { DeviceStatus, RegisterDeviceResponse } from './interfaces/device.interface';
import { LoginResponse } from './interfaces/login.interface';
 
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
