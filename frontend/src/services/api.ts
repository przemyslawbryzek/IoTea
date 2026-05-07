import type { DeviceStatus, DeviceSummary } from '../interfaces/device.interface';
import type { BrewStatusEvent, BrewSummary } from '../interfaces/brew.interface';
import type { LoginResponse } from '../interfaces/login.interface';
import type {
  MyTeaDetail,
  MyTeaFormValues,
  MyTeaInstruction,
  MyTeaInstructionFormValues,
  MyTeaSummary,
} from '../interfaces/mytea.interface';
import type { Tea } from '../interfaces/tea.interface';
import type { CurrentUser } from '../interfaces/user.interface';
import { getAccessToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

type HealthResponse = {
  status: string;
  service?: string;
  timestamp: string;
};

type RequestOptions = {
  auth?: boolean;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => null as { message?: string; errors?: Array<{ message: string }> } | null);
    const message =
      payload?.message ?? payload?.errors?.[0]?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getHealth() {
  return request<HealthResponse>('/health');
}

export async function getTeas() {
  return request<Tea[]>('/tea', { auth: true });
}

export async function getTeaCategories() {
  return request<Array<{ id: number; name: string; icon_url: string | null }>>('/tea/category', {
    auth: true,
  });
}

export async function getTeaById(teaId: number) {
  return request<Tea>(`/tea/${teaId}`, { auth: true });
}

export async function addTeaFavorite(teaId: number, source: 'base' | 'user') {
  return request<{ is_favorite: boolean }>(`/tea/${teaId}/favorite?source=${source}`, {
    method: 'POST',
    auth: true,
  });
}

export async function removeTeaFavorite(teaId: number, source: 'base' | 'user') {
  return request<{ is_favorite: boolean }>(`/tea/${teaId}/favorite?source=${source}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function setTeaRating(teaId: number, source: 'base' | 'user', value: 0 | 1) {
  return request<{ value: number; rating_percent?: number | null }>(`/tea/${teaId}/rating?source=${source}`, {
    method: 'POST',
    auth: true,
    body: { value },
  });
}

export async function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function refreshAccessToken(refresh_token: string) {
  return request<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token },
  });
}

export async function register(email: string, password: string, name: string) {
  return request('/auth/register', {
    method: 'POST',
    body: { email, password, name },
  });
}

export async function getDevices() {
  return request<DeviceSummary[]>('/devices', { auth: true });
}

export async function deleteDevice(deviceId: number) {
  return request<{ message: string }>(`/devices/${deviceId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getBrews() {
  return request<BrewSummary[]>('/brews', { auth: true });
}

export async function getBrewHistory(brewId: number) {
  return request<BrewStatusEvent[]>(`/brews/${brewId}/history`, { auth: true });
}

export async function getDeviceStatus(deviceId: number) {
  return request<DeviceStatus>(`/devices/${deviceId}/status`, { auth: true });
}

export async function getCurrentUser() {
  return request<CurrentUser>('/users', { auth: true });
}

export async function updateCurrentUser(body: { name: string }) {
  return request<CurrentUser>('/users', {
    method: 'PUT',
    auth: true,
    body,
  });
}

export async function getMyTeas() {
  return request<MyTeaSummary[]>('/mytea', { auth: true });
}

export async function getMyTeaById(teaId: number) {
  return request<MyTeaDetail>(`/mytea/${teaId}`, { auth: true });
}

export async function createMyTea(body: MyTeaFormValues) {
  return request<MyTeaSummary>('/mytea', {
    method: 'POST',
    auth: true,
    body,
  });
}

export async function updateMyTea(teaId: number, body: MyTeaFormValues) {
  return request<MyTeaSummary>(`/mytea/${teaId}`, {
    method: 'PUT',
    auth: true,
    body,
  });
}

export async function deleteMyTea(teaId: number) {
  return request<{ message: string }>(`/mytea/${teaId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getBrewingStyles() {
  return request<Array<{ id: number; name: string; description: string | null }>>('/mytea/styles', {
    auth: true,
  });
}

export async function getMyTeaInstructions(teaId: number) {
  return request<MyTeaInstruction[]>(`/mytea/${teaId}/instructions`, { auth: true });
}

export async function createMyTeaInstruction(
  teaId: number,
  body: MyTeaInstructionFormValues,
) {
  return request<MyTeaInstruction>(`/mytea/${teaId}/instructions`, {
    method: 'POST',
    auth: true,
    body,
  });
}

export async function updateMyTeaInstruction(
  teaId: number,
  instructionId: number,
  body: MyTeaInstructionFormValues,
) {
  return request<MyTeaInstruction>(`/mytea/${teaId}/instructions/${instructionId}`, {
    method: 'PUT',
    auth: true,
    body,
  });
}

export async function deleteMyTeaInstruction(teaId: number, instructionId: number) {
  return request<{ message: string }>(`/mytea/${teaId}/instructions/${instructionId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function startBrew(brewData: {
  deviceId: number;
  instructionId: number;
  volumeMl: number;
  brewNumber: number;
}) {
  return request<{ id: number }>('/brews/start', {
    method: 'POST',
    auth: true,
    body: brewData,
  });
}
