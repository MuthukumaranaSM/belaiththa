import React from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

export default function ReceptionistDashboard() {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 14, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user?.name}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Appointment Management
            </Typography>
            {/* Add appointment management tools here */}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Patient Registration
            </Typography>
            {/* Add patient registration form here */}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Daily Schedule
            </Typography>
            {/* Add daily schedule view here */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 
