import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { User, UserRole } from '../../../entities/user.entity';

const userRepository = AppDataSource.getRepository(User);

export const formatDate = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
};

export const formatDateOnly = (value: Date | string): string => {
  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString().slice(0, 10);
};

export const getDayFromDate = (date: string): string =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );

export const addDays = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const parseMoney = (value: string | number): number => Number(value);

export const ensureDoctorUser = async (doctorId: string): Promise<User> => {
  const doctor = await userRepository.findOne({
    where: {
      id: doctorId,
      role: UserRole.DOCTOR,
    },
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  return doctor;
};
