import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { format, addDays, isSameDay } from 'date-fns';
import { appointmentApi, dentistApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  dentistId?: number;
}

interface Appointment {
  _id: string;
  date: string;
  time: string;
  status: string;
}

interface Availability {
  _id: string;
  date: string;
  time: string;
  isBlocked: boolean;
}

interface Dentist {
  id: number;
  name: string;
  specialty?: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM'
];

const services = [
  'Dental Cleaning',
  'Root Canal',
  'Teeth Whitening',
  'Dental Filling',
  'Tooth Extraction',
  'Dental Crown',
  'Dental Bridge',
  'Dental Implant',
];

const AppointmentModal: React.FC<AppointmentModalProps> = ({ open, onClose, dentistId: defaultDentistId }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState<number | undefined>(defaultDentistId);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDentists();
    }
  }, [open]);

  useEffect(() => {
    if (selectedDate && selectedDentistId && open) {
      fetchAvailability();
      fetchAppointments();
      fetchBlockedSlots();
    }
  }, [selectedDate, selectedDentistId, open]);

  const fetchDentists = async () => {
    try {
      const data = await dentistApi.getAllDentists();
      setDentists(data);
      if (!defaultDentistId && data.length > 0) {
        setSelectedDentistId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching dentists:', error);
      setError('Failed to fetch dentists');
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDentistId) return;
    try {
      const startDate = format(selectedDate!, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate!, 1), 'yyyy-MM-dd');
      const data = await appointmentApi.getAvailability(selectedDentistId.toString(), startDate, endDate);
      setAvailability(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to fetch availability');
      setAvailability([]);
    }
  };

  const fetchAppointments = async () => {
    if (!selectedDentistId) return;
    try {
      const data = await appointmentApi.getDentistAppointments(selectedDentistId.toString());
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to fetch appointments');
      setAppointments([]);
    }
  };

  const fetchBlockedSlots = async () => {
    if (!selectedDentistId) return;
    try {
      const startDate = format(selectedDate!, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate!, 1), 'yyyy-MM-dd');
      const data = await appointmentApi.getBlockedSlots(
        selectedDentistId.toString(),
        startDate,
        endDate
      );
      setBlockedSlots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      setBlockedSlots([]);
    }
  };

  const isTimeSlotBlocked = (time: string): boolean => {
    if (!selectedDate) return false;

    return blockedSlots.some(slot => {
      if (!isSameDay(new Date(slot.date), selectedDate)) return false;

      const slotStartTime = convertTo24Hour(slot.startTime);
      const slotEndTime = convertTo24Hour(slot.endTime);
      const currentTime = convertTo24Hour(time);

      return currentTime >= slotStartTime && currentTime <= slotEndTime;
    });
  };

  const convertTo24Hour = (time: string): string => {
    const isPM = time.includes('PM');
    const [hours, minutes] = time.replace(/ [AP]M$/, '').split(':');
    let hour = parseInt(hours, 10);
    
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!selectedDate) {
      return true;
    }

    if (isTimeSlotBlocked(time)) {
      return false;
    }

    const hasAppointment = appointments.some(
      app => isSameDay(new Date(app.date), selectedDate) && app.time === time
    );

    return !hasAppointment;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedService || !customerName || !customerEmail || !selectedDentistId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const appointmentDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(selectedTime.split(':')[0]),
        parseInt(selectedTime.split(':')[1])
      ).toISOString();

      await appointmentApi.create({
        customerName,
        customerEmail,
        dentistId: selectedDentistId,
        appointmentDate,
        reason: selectedService,
        notes: notes
      });
      onClose();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      setError(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Book an Appointment</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Grid container spacing={3}>
          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Your Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Your Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              margin="normal"
            />
          </Grid>

          {/* Dentist Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Select Dentist</InputLabel>
              <Select
                value={selectedDentistId || ''}
                onChange={(e) => setSelectedDentistId(Number(e.target.value))}
                label="Select Dentist"
              >
                {dentists.map((dentist) => (
                  <MenuItem key={dentist.id} value={dentist.id}>
                    {dentist.name} {dentist.specialty ? `- ${dentist.specialty}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Calendar Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Select Date
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  sx={{ width: '100%' }}
                  minDate={new Date()}
                />
              </LocalizationProvider>
            </Box>
          </Grid>

          {/* Time Slots Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </Typography>
              <Grid container spacing={1}>
                {timeSlots.map((time) => {
                  const available = isTimeSlotAvailable(time);
                  const isBlocked = isTimeSlotBlocked(time);
                  const blockedSlot = blockedSlots.find(slot => 
                    isSameDay(new Date(slot.date), selectedDate!) && 
                    time >= slot.startTime && 
                    time <= slot.endTime
                  );

                  return (
                    <Grid item xs={6} key={time}>
                      <Tooltip 
                        title={isBlocked ? `Not available - ${blockedSlot?.reason || 'Blocked by dentist'}` : ''}
                        arrow
                      >
                        <span style={{ width: '100%' }}>
                          <Button
                            fullWidth
                            variant={selectedTime === time ? "contained" : "outlined"}
                            color={selectedTime === time ? "primary" : isBlocked ? "error" : "inherit"}
                            disabled={!available}
                            onClick={() => setSelectedTime(time)}
                            sx={{
                              mb: 1,
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              ...(isBlocked && {
                                borderColor: 'error.main',
                                color: 'error.main',
                                '&.Mui-disabled': {
                                  borderColor: 'error.main',
                                  color: 'error.main',
                                },
                              }),
                              ...(available && !isBlocked && {
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                  color: 'white',
                                },
                              }),
                            }}
                          >
                            {time}
                          </Button>
                        </span>
                      </Tooltip>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Grid>

          {/* Service Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Service</InputLabel>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                label="Service"
                required
              >
                {services.map((service) => (
                  <MenuItem key={service} value={service}>
                    {service}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedDate || !selectedTime || !selectedService || !customerName || !customerEmail || !selectedDentistId || loading}
        >
          {loading ? 'Booking...' : 'Book Appointment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentModal;
