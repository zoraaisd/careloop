export const frontendClients = [
  {
    name: 'doctor-frontend',
    primaryRole: 'doctor',
    routes: ['/api/doctor/auth/login', '/api/doctor/*'],
  },
  {
    name: 'admin-frontend',
    primaryRole: 'admin',
    routes: ['/api/admin/auth/login', '/api/admin/*'],
  },
] as const;
