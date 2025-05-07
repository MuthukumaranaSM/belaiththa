import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Add axios interceptor to include token in all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

interface CreateUserData extends SignupData {
  specialization?: string;
  licenseNumber?: string;
  shift?: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
}

export const authApi = {
  login: async (data: LoginData) => {
    const response = await axios.post(`${API_URL}/auth/login`, data);
    return response.data;
  },
  signup: async (data: SignupData) => {
    const response = await axios.post(`${API_URL}/auth/signup`, data);
    return response.data;
  },
  createUser: async (data: CreateUserData) => {
    const response = await axios.post(`${API_URL}/auth/admin/create-user`, data);
    return response.data;
  },
  getAllUsers: async () => {
    const response = await axios.get(`${API_URL}/auth/users`);
    return response.data;
  },
  createCustomer: async (data: CreateCustomerData) => {
    const response = await axios.post(`${API_URL}/auth/create-customer`, data);
    return response.data;
  },
};

export interface AppointmentData {
  customerName: string;
  customerEmail: string;
  dentistId: number;
  appointmentDate: string;
  reason: string;
  notes?: string;
}

export interface BlockSlotData {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  dentistId: number;
}

export const appointmentApi = {
  create: async (data: AppointmentData) => {
    const response = await axios.post(`${API_URL}/appointments`, data);
    return response.data;
  },
  getAvailability: async (dentistId: string, startDate: string, endDate: string) => {
    const response = await axios.get(`${API_URL}/appointments/availability/${dentistId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },
  getDentistAppointments: async (dentistId: string) => {
    const response = await axios.get(`${API_URL}/appointments/dentist/${dentistId}`);
    return response.data;
  },
  getCustomerAppointments: async (customerId: string) => {
    const response = await axios.get(`${API_URL}/appointments/customer/${customerId}`);
    return response.data;
  },
  blockTimeSlot: async (data: BlockSlotData) => {
    const response = await axios.post(`${API_URL}/appointments/block-slot`, data);
    return response.data;
  },
  getBlockedSlots: async (dentistId: string, startDate: string, endDate: string) => {
    const response = await axios.get(`${API_URL}/appointments/blocked-slots/${dentistId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },
  unblockTimeSlot: async (slotId: string) => {
    const response = await axios.delete(`${API_URL}/appointments/block-slot/${slotId}`);
    return response.data;
  },
  getReceptionistAppointments: async () => {
    const response = await axios.get(`${API_URL}/appointments/receptionist/all`);
    return response.data;
  },
  updateAppointmentStatus: async (appointmentId: number, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    const response = await axios.patch(`${API_URL}/appointments/${appointmentId}`, { status });
    return response.data;
  },
  generateBill: async (appointmentId: string, billData: {
    serviceDescription: string;
    amount: number;
    additionalNotes?: string;
  }) => {
    const response = await axios.post(`${API_URL}/appointments/${appointmentId}/bill`, billData);
    return response.data;
  },
};

export const dentistApi = {
  getAllDentists: async () => {
    const response = await axios.get(`${API_URL}/auth/users/dentists`);
    return response.data;
  }
};

export const prescriptionApi = {
  create: async (data: {
    patientId: number;
    medication: string;
    dosage: string;
    instructions: string;
  }) => {
    const response = await axios.post(`${API_URL}/prescriptions`, data);
    return response.data;
  },

  getPatientPrescriptions: async (patientId: number) => {
    const response = await axios.get(`${API_URL}/prescriptions/patient/${patientId}`);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await axios.delete(`${API_URL}/prescriptions/${id}`);
    return response.data;
  },
};
