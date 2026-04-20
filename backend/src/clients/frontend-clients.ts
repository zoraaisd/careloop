export const frontendClients = [
  {
    name: 'auth-frontend',
    primaryRole: 'patient',
    routes: ['/api/auth/*', '/api/patient/*'],
  },
  {
    name: 'doctor-frontend',
    primaryRole: 'doctor',
    routes: ['/api/auth/login', '/api/doctor/*'],
  },
  {
    name: 'admin-frontend',
    primaryRole: 'admin',
    routes: ['/api/auth/login', '/api/admin/*'],
  },
] as const;
