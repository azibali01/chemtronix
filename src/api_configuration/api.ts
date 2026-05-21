// src/api_configuration/api.ts
import axios from "axios";
import { notifications } from "@mantine/notifications";

const productionApiBaseURL = "https://chemtronics-backend-xufv.onrender.com";

const configuredApiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(
  /\/+$/,
  "",
);

// Check if it's localhost (true dev) vs deployed (production)
const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";

export const apiBaseURL =
  configuredApiBaseURL || (isLocalhost ? "" : productionApiBaseURL);

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true, // ✅ Important for CORS + cookies
});

api.interceptors.request.use((config) => {
  const brand = (localStorage.getItem("brand") || "chemtronics").toLowerCase();
  config.headers["x-brand"] = brand;

  // Add JWT token if available
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response Error Interceptor: Handles validation errors and other HTTP errors
 * - 400 Bad Request: Displays field-level validation errors from backend
 * - 401 Unauthorized: Shows authentication error
 * - 403 Forbidden: Shows permission error
 * - 500+ Server Error: Shows generic server error
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle validation errors (400 Bad Request)
    if (error.response?.status === 400) {
      const validationErrors = error.response.data?.errors;
      const message = error.response.data?.message || "Validation failed";

      if (validationErrors && typeof validationErrors === "object") {
        // Format field errors for display
        const errorMessages = Object.entries(validationErrors)
          .map(([field, msgs]) => {
            const fieldMessages = Array.isArray(msgs) ? msgs : [msgs];
            return `${field}: ${fieldMessages.join(", ")}`;
          })
          .join("\n");

        notifications.show({
          id: `validation-error-${Date.now()}`,
          title: "Validation Error",
          message: errorMessages,
          color: "red",
          autoClose: 5000,
        });
      } else {
        // Show generic validation error if no field details
        notifications.show({
          id: `validation-error-${Date.now()}`,
          title: "Validation Error",
          message: message,
          color: "red",
          autoClose: 5000,
        });
      }
    }
    // Handle authentication errors (401 Unauthorized)
    else if (error.response?.status === 401) {
      notifications.show({
        id: "auth-error",
        title: "Authentication Required",
        message: "Your session has expired. Please log in again.",
        color: "orange",
        autoClose: 5000,
      });
      // Optional: Redirect to login
      // window.location.href = '/auth/login';
    }
    // Handle permission errors (403 Forbidden)
    else if (error.response?.status === 403) {
      notifications.show({
        id: "permission-error",
        title: "Permission Denied",
        message: "You do not have permission to perform this action.",
        color: "yellow",
        autoClose: 5000,
      });
    }
    // Handle server errors (5xx)
    else if (error.response?.status >= 500) {
      notifications.show({
        id: `server-error-${Date.now()}`,
        title: "Server Error",
        message:
          error.response.data?.message ||
          "An unexpected server error occurred. Please try again later.",
        color: "red",
        autoClose: 5000,
      });
    }
    // Handle network errors
    else if (!error.response) {
      notifications.show({
        id: "network-error",
        title: "Network Error",
        message:
          "Unable to connect to the server. Please check your internet connection.",
        color: "red",
        autoClose: 5000,
      });
    }

    // Always reject to allow component-level error handling if needed
    return Promise.reject(error);
  },
);

export default api;
