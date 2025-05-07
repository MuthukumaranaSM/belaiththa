import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Paper,
  Button,
  Box,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  Event as EventIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Payment as PaymentIcon,
  Medication as MedicationIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { dashboardStyles } from './DashboardStyles';
import { appointmentApi, prescriptionApi } from '../../services/api';
import { format } from 'date-fns';

interface Appointment {
  id: number;
  appointmentDate: string;
  status: string;
  reason: string;
  dentist: {
    name: string;
  };
}

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  instructions: string;
  createdAt: string;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [appointmentSubTab, setAppointmentSubTab] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchAppointments();
      fetchPrescriptions();
    }
  }, [user?.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentApi.getCustomerAppointments(user?.id.toString() || '');
      setAppointments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await prescriptionApi.getPatientPrescriptions(user?.id || 0);
      setPrescriptions(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
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

  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    
    if (appointmentSubTab === 0) { // Upcoming appointments
      return appointmentDate >= now && appointment.status !== 'CANCELLED';
    } else { // Past appointments
      return appointmentDate < now || appointment.status === 'CANCELLED';
    }
  });

  const renderPrescriptionsTab = () => {
    return (
      <Paper sx={{ p: 3, mt: 2, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MedicationIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" color="primary">
            Your Prescriptions
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
                  <TableCell>Medication</TableCell>
                  <TableCell>Dosage</TableCell>
                  <TableCell>Instructions</TableCell>
                  <TableCell>Prescribed Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No prescriptions found</TableCell>
                  </TableRow>
                ) : (
                  prescriptions.map((prescription) => (
                    <TableRow key={prescription.id} hover>
                      <TableCell>{prescription.medication}</TableCell>
                      <TableCell>{prescription.dosage}</TableCell>
                      <TableCell>{prescription.instructions}</TableCell>
                      <TableCell>{format(new Date(prescription.createdAt), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 14, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user?.name}
      </Typography>

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={dashboardStyles.statsCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {appointments.filter(a => new Date(a.appointmentDate) >= new Date() && a.status !== 'CANCELLED').length}
                </Typography>
                <Typography color="text.secondary">Upcoming Appointments</Typography>
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
                  {appointments.filter(a => a.status === 'COMPLETED').length}
                </Typography>
                <Typography color="text.secondary">Completed Visits</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={dashboardStyles.statsCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MedicationIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {prescriptions.length}
                </Typography>
                <Typography color="text.secondary">Active Prescriptions</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Appointments" />
          <Tab label="Prescriptions" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 ? (
        <Paper sx={dashboardStyles.appointmentCard}>
          <Box sx={dashboardStyles.appointmentHeader}>
            <Typography variant="h6" sx={dashboardStyles.sectionTitle}>
              Your Appointments
            </Typography>
            <Button
              variant="contained"
              startIcon={<EventIcon />}
              sx={dashboardStyles.actionButton}
            >
              Book New Appointment
            </Button>
          </Box>

          <Tabs
            value={appointmentSubTab}
            onChange={(_, newValue) => setAppointmentSubTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Upcoming" />
            <Tab label="Past" />
          </Tabs>

          {error && (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          )}

          <List sx={dashboardStyles.appointmentList}>
            {filteredAppointments.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No appointments found"
                  secondary={appointmentSubTab === 0 ? "You don't have any upcoming appointments" : "You don't have any past appointments"}
                />
              </ListItem>
            ) : (
              filteredAppointments.map((appointment) => (
                <React.Fragment key={appointment.id}>
                  <ListItem sx={dashboardStyles.appointmentItem}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#1565c0' }}>
                        <HospitalIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={appointment.reason}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {format(new Date(appointment.appointmentDate), 'PPp')}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="text.secondary">
                            Doctor: {appointment.dentist.name}
                          </Typography>
                        </>
                      }
                    />
                    {getStatusChip(appointment.status)}
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      ) : (
        renderPrescriptionsTab()
      )}
    </Container>
  );
};

export default CustomerDashboard; 
