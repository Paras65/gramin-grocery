/**
 * apiConfig.ts — Single Source of Truth for API Endpoint Resolution
 * Eliminates duplicate API_BASE declarations across client services.
 */

export const API_BASE: string =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/v1'
    : '/api/v1');

