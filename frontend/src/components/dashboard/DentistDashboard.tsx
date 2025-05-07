import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Paper,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { format, addDays, isSameDay } from 'date-fns';
import {
  Event as EventIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Done as DoneIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { dashboardStyles } from './DashboardStyles';
import { appointmentApi, prescriptionApi } from '../../services/api';
import { message } from 'antd';

interface Appointment {
  id: number;
  appointmentDate: string;
  status: string;
  reason: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
}

interface Prescription {
  id: number;
  patientId: number;
  medication: string;
  dosage: string;
  instructions: string;
  createdAt: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

const API_URL = 'http://localhost:3000';

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM'
];

const DentistDashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [openPrescriptionDialog, setOpenPrescriptionDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Appointment | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication: '',
    dosage: '',
    instructions: '',
  });
  const [patientFilter, setPatientFilter] = useState<'all' | 'confirmed' | 'completed'>('all');

  useEffect(() => {
    if (user?.id) {
      fetchAppointments();
      fetchBlockedSlots();
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchAllPrescriptions = async () => {
      if (appointments.length > 0) {
        try {
          setLoading(true);
          // Fetch prescriptions for all patients
          const allPrescriptions = await Promise.all(
            appointments.map(appointment => 
              prescriptionApi.getPatientPrescriptions(appointment.customer.id)
            )
          );
          // Flatten the array of prescription arrays
          const flattenedPrescriptions = allPrescriptions.flat();
          setPrescriptions(flattenedPrescriptions);
        } catch (err) {
          console.error('Error fetching prescriptions:', err);
          setError('Failed to fetch prescriptions');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAllPrescriptions();
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentApi.getDentistAppointments(user?.id.toString() || '');
      setAppointments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (patientId: number) => {
    try {
      setLoading(true);
      const data = await prescriptionApi.getPatientPrescriptions(patientId);
      console.log('Fetched prescriptions:', data);
      setPrescriptions(data);
    } catch (err: any) {
      console.error('Error fetching prescriptions:', err);
      setError('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = async () => {
    if (!selectedPatient) return;

    try {
      setLoading(true);
      const response = await prescriptionApi.create({
        patientId: selectedPatient.customer.id,
        ...prescriptionForm,
      });
      
      console.log('Created prescription:', response);
      setSuccessMessage('Prescription added successfully');
      
      await fetchPrescriptions(selectedPatient.customer.id);
      
      setOpenPrescriptionDialog(false);
      setPrescriptionForm({ medication: '', dosage: '', instructions: '' });
    } catch (err: any) {
      console.error('Error adding prescription:', err);
      setError(err.response?.data?.message || 'Failed to add prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrescription = async (prescriptionId: number) => {
    try {
      await prescriptionApi.delete(prescriptionId);
      setSuccessMessage('Prescription deleted successfully');
      if (selectedPatient) {
        await fetchPrescriptions(selectedPatient.customer.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete prescription');
    }
  };

  const fetchBlockedSlots = async () => {
    if (!selectedDate || !user?.id) return;
    
    try {
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      const response = await appointmentApi.getBlockedSlots(
        user.id.toString(),
        startDate,
        endDate
      );
      setBlockedSlots(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      setBlockedSlots([]);
    }
  };

  const handleBlockTime = async () => {
    if (!selectedDate || !user?.id) {
      message.error('Please select a date and ensure you are logged in');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const endTime = `${hours}:${Number(minutes) + 30}`; // Add 30 minutes for the slot

      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      await appointmentApi.blockTimeSlot({
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime,
        reason: blockReason,
        dentistId: user.id
      });
      
      setOpenBlockDialog(false);
      setBlockReason('');
      fetchBlockedSlots();
    } catch (error: any) {
      console.error('Error blocking time:', error);
      setError(error.response?.data?.message || 'Failed to block time slot');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockTime = async (slotId: string) => {
    try {
      await appointmentApi.unblockTimeSlot(slotId);
      fetchBlockedSlots();
    } catch (error: any) {
      console.error('Error unblocking time:', error);
      setError(error.response?.data?.message || 'Failed to unblock time slot');
    }
  };

  const isTimeSlotBlocked = (time: string): boolean => {
    if (!selectedDate) return false;

    return blockedSlots.some(slot => 
      isSameDay(new Date(slot.date), selectedDate) &&
      slot.startTime <= time &&
      slot.endTime > time
    );
  };

  const isTimeSlotBooked = (time: string): boolean => {
    if (!selectedDate) return false;

    return appointments.some(app => 
      isSameDay(new Date(app.appointmentDate), selectedDate) &&
      format(new Date(app.appointmentDate), 'hh:mm a') === time
    );
  };

  const handleStatusChange = async (appointmentId: number, newStatus: string) => {
    try {
      await appointmentApi.updateAppointmentStatus(
        appointmentId,
        newStatus as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
      );
      setSuccessMessage('Appointment status updated successfully');
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const getStatusChip = (status: string) => {
    const statusStyles = {
      CONFIRMED: { ...dashboardStyles.statusChip, ...dashboardStyles.statusConfirmed },
      PENDING: { ...dashboardStyles.statusChip, ...dashboardStyles.statusPending },
      CANCELLED: { ...dashboardStyles.statusChip, ...dashboardStyles.statusCancelled },
      COMPLETED: { ...dashboardStyles.statusChip, ...dashboardStyles.statusCompleted },
    };

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        sx={statusStyles[status as keyof typeof statusStyles]}
      />
    );
  };

  const getStatusActions = (appointment: Appointment) => {
    switch (appointment.status) {
      case 'PENDING':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')}
            >
              Confirm
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
            >
              Cancel
            </Button>
          </Box>
        );
      case 'CONFIRMED':
        return (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<DoneIcon />}
            onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
          >
            Mark Complete
          </Button>
        );
      default:
        return null;
    }
  };

  const renderPatientsTab = () => {
    const confirmedPatients = appointments.filter(app => app.status === 'CONFIRMED');
    const completedPatients = appointments.filter(app => app.status === 'COMPLETED');

    return (
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={600} color="primary">
            Patient Management
          </Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter Patients</InputLabel>
            <Select
              value={patientFilter}
              label="Filter Patients"
              onChange={(e) => setPatientFilter(e.target.value as 'all' | 'confirmed' | 'completed')}
            >
              <MenuItem value="all">All Patients</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* All Patients with Prescriptions */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" color="primary">
              All Patients and Prescriptions
            </Typography>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Appointment Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Prescriptions</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No patients found</TableCell>
                    </TableRow>
                  ) : (
                    appointments.map((appointment) => {
                      const patientPrescriptions = prescriptions.filter(
                        p => p.patientId === appointment.customer.id
                      );
                      
                      return (
                        <TableRow key={appointment.id} hover>
                          <TableCell>{appointment.customer.name}</TableCell>
                          <TableCell>{appointment.customer.email}</TableCell>
                          <TableCell>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy hh:mm a')}</TableCell>
                          <TableCell>{getStatusChip(appointment.status)}</TableCell>
                          <TableCell>
                            {patientPrescriptions.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No prescriptions
                              </Typography>
                            ) : (
                              patientPrescriptions.map(prescription => (
                                <Box key={prescription.id} sx={{ mb: 1 }}>
                                  <Typography variant="body2">
                                    <strong>{prescription.medication}</strong> - {prescription.dosage}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {prescription.instructions}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePrescription(prescription.id);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setSelectedPatient(appointment);
                                setOpenPrescriptionDialog(true);
                              }}
                            >
                              Add Prescription
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Confirmed Patients Section */}
        {(patientFilter === 'all' || patientFilter === 'confirmed') && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="h6" color="primary">
                Confirmed Patients
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Appointment Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {confirmedPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No confirmed patients found</TableCell>
                    </TableRow>
                  ) : (
                    confirmedPatients.map((appointment) => (
                      <TableRow 
                        key={appointment.id} 
                        hover 
                        onClick={() => setSelectedPatient(appointment)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{appointment.customer.name}</TableCell>
                        <TableCell>{appointment.customer.email}</TableCell>
                        <TableCell>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy hh:mm a')}</TableCell>
                        <TableCell>{appointment.reason}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatient(appointment);
                              setOpenPrescriptionDialog(true);
                            }}
                          >
                            Add Prescription
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Completed Patients Section */}
        {(patientFilter === 'all' || patientFilter === 'completed') && (
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DoneIcon sx={{ color: 'info.main', mr: 1 }} />
              <Typography variant="h6" color="primary">
                Completed Patients
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Visit Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {completedPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No completed patients found</TableCell>
                    </TableRow>
                  ) : (
                    completedPatients.map((appointment) => (
                      <TableRow 
                        key={appointment.id} 
                        hover
                        onClick={() => setSelectedPatient(appointment)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{appointment.customer.name}</TableCell>
                        <TableCell>{appointment.customer.email}</TableCell>
                        <TableCell>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy hh:mm a')}</TableCell>
                        <TableCell>{appointment.reason}</TableCell>
                        <TableCell align="right">
                          {/* Removed the View/Add Prescription button */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 14, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, Dr. {user?.name}
      </Typography>

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={dashboardStyles.statsCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {appointments.filter(a => a.status === 'PENDING').length}
                </Typography>
                <Typography color="text.secondary">Pending Appointments</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={dashboardStyles.statsCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {appointments.filter(a => a.status === 'CONFIRMED').length}
                </Typography>
                <Typography color="text.secondary">Confirmed Today</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={dashboardStyles.statsCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PaymentIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {appointments.filter(a => a.status === 'COMPLETED').length}
                </Typography>
                <Typography color="text.secondary">Completed Today</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Appointments" />
          <Tab label="Patients" />
          <Tab label="Calendar" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
            Today's Appointments
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No appointments found</TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id} hover>
                      <TableCell>
                        {format(new Date(appointment.appointmentDate), 'hh:mm a')}
                      </TableCell>
                      <TableCell>{appointment.customer.name}</TableCell>
                      <TableCell>{appointment.customer.email}</TableCell>
                      <TableCell>{appointment.reason}</TableCell>
                      <TableCell>{getStatusChip(appointment.status)}</TableCell>
                      <TableCell align="right">
                        {getStatusActions(appointment)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : activeTab === 1 ? (
        renderPatientsTab()
      ) : (
        <Grid container spacing={3}>
          {/* Calendar Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={dashboardStyles.statsCard}>
              <Typography variant="h6" sx={dashboardStyles.sectionTitle}>
                Calendar
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(newDate) => {
                    setSelectedDate(newDate);
                    fetchBlockedSlots();
                  }}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Paper>
          </Grid>

          {/* Time Slots Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={dashboardStyles.statsCard}>
              <Typography variant="h6" sx={dashboardStyles.sectionTitle}>
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </Typography>
              <Grid container spacing={1}>
                {timeSlots.map((time) => {
                  const isBlocked = isTimeSlotBlocked(time);
                  const isBooked = isTimeSlotBooked(time);

                  return (
                    <Grid item xs={6} key={time}>
                      <Button
                        fullWidth
                        variant={isBooked ? "contained" : "outlined"}
                        color={isBooked ? "primary" : "inherit"}
                        disabled={isBlocked || isBooked}
                        onClick={() => {
                          if (!isBlocked && !isBooked) {
                            setSelectedTime(time);
                            setOpenBlockDialog(true);
                          }
                        }}
                        sx={{
                          mb: 1,
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          ...(isBooked && {
                            backgroundColor: '#1565c0',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: '#0d47a1',
                            },
                          }),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography variant="body2">{time}</Typography>
                          {isBooked && (
                            <Box sx={{ ml: 'auto' }}>
                              {getStatusChip('CONFIRMED')}
                            </Box>
                          )}
                        </Box>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Block Time Dialog */}
      <Dialog open={openBlockDialog} onClose={() => setOpenBlockDialog(false)}>
        <DialogTitle>Block Time Slot</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedDate && format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              multiline
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBlockDialog(false)}>Cancel</Button>
          <Button onClick={handleBlockTime} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Prescription Dialog */}
      <Dialog open={openPrescriptionDialog} onClose={() => setOpenPrescriptionDialog(false)}>
        <DialogTitle>Add Prescription</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Medication"
              value={prescriptionForm.medication}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Dosage"
              value={prescriptionForm.dosage}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Instructions"
              multiline
              rows={3}
              value={prescriptionForm.instructions}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrescriptionDialog(false)}>Cancel</Button>
          <Button onClick={handleAddPrescription} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={!!error || !!successMessage}
        autoHideDuration={6000}
        onClose={() => {
          setError(null);
          setSuccessMessage(null);
        }}
      >
        <Alert
          onClose={() => {
            setError(null);
            setSuccessMessage(null);
          }}
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {error || successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DentistDashboard;
