import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const unwrapData = (response) => response.data.data;

export const unwrapPaginated = (response) => ({
  data: response.data.data,
  meta: response.data.meta
});
