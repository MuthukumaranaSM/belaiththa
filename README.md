# Dental Management System

A comprehensive dental clinic management system built with React, NestJS, and PostgreSQL.

## Features

- User Authentication & Authorization
- Role-based Access Control (Admin, Doctor, Receptionist, Patient)
- Appointment Management
- Patient Records Management
- Prescription Management
- Interactive Dashboard for Different Roles
- Modern and Responsive UI

## Tech Stack

### Frontend
- React with TypeScript
- Material-UI for components
- React Router for navigation
- Axios for API calls
- Context API for state management

### Backend
- NestJS framework
- PostgreSQL database
- Prisma ORM
- JWT authentication
- Swagger API documentation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mk1shan/dental-belaiththa.git
cd dental-belaiththa
```

2. Install Backend Dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with:
```
DATABASE_URL="postgresql://username:password@localhost:5432/dental_db"
JWT_SECRET="your-secret-key"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Install Frontend Dependencies:
```bash
cd ../frontend
npm install
```

6. Start the Development Servers:

Backend:
```bash
cd backend
npm run start:dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
