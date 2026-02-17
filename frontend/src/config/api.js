// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    SIGNUP: `${API_BASE_URL}/api/auth/signup`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`
  },
  EVENTS: {
    ALL: `${API_BASE_URL}/api/events/all`,
    MY_EVENTS: `${API_BASE_URL}/api/events/my-events`,
    MY_REGISTRATIONS: `${API_BASE_URL}/api/events/my-registrations`,
    CREATE: `${API_BASE_URL}/api/events`,
    REGISTER: (id) => `${API_BASE_URL}/api/events/register/${id}`,
    REGISTER_TEAM: (id) => `${API_BASE_URL}/api/events/register-team/${id}`,
    UNREGISTER: (id) => `${API_BASE_URL}/api/events/unregister/${id}`,
    DETAILS: (id) => `${API_BASE_URL}/api/events/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/events/${id}`,
    SCAN_QR: `${API_BASE_URL}/api/events/scan-qr`,
    VERIFY_TICKET: (eventId) => `${API_BASE_URL}/api/events/verify-ticket/${eventId}`,
    FORM_RESPONSES: (id) => `${API_BASE_URL}/api/events/${id}/form-responses`
  },
  USERS: {
    PROFILE: `${API_BASE_URL}/api/users/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile`,
    MY_TICKETS: `${API_BASE_URL}/api/users/my-tickets`,
    ORGANIZERS: `${API_BASE_URL}/api/users/organizers`,
    FOLLOW: (id) => `${API_BASE_URL}/api/users/follow/${id}`,
    UPDATE_ONBOARDING: `${API_BASE_URL}/api/users/update-onboarding`
  },
  ADMIN: {
    CREATE_ORGANIZER: `${API_BASE_URL}/api/admin/create-organizer`,
    ALL_ORGANIZERS: `${API_BASE_URL}/api/admin/organizers`,
    ORGANIZER_EVENTS: (id) => `${API_BASE_URL}/api/admin/organizer/${id}/events`,
    DELETE_ORGANIZER: (id) => `${API_BASE_URL}/api/admin/organizer/${id}`
  },
  FEEDBACK: {
    SUBMIT: (eventId) => `${API_BASE_URL}/api/feedback/${eventId}`,
    GET_EVENT_FEEDBACK: (eventId) => `${API_BASE_URL}/api/feedback/event/${eventId}`,
    GET_STATS: (eventId) => `${API_BASE_URL}/api/feedback/event/${eventId}/stats`,
    EXPORT: (eventId) => `${API_BASE_URL}/api/feedback/event/${eventId}/export`,
    CHECK_SUBMITTED: (eventId) => `${API_BASE_URL}/api/feedback/my-feedback/${eventId}`,
    CAN_SUBMIT: (eventId) => `${API_BASE_URL}/api/feedback/can-submit/${eventId}`
  }
};

export default API_BASE_URL;
