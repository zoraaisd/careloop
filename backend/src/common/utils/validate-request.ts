import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AppError } from '../errors/app-error';

type ClassConstructor<T> = {
  new (): T;
};

export const validateRequest = async <T extends object>(
  cls: ClassConstructor<T>,
  payload: unknown,
): Promise<T> => {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const details = errors.map((error) => ({
      field: error.property,
      constraints: error.constraints,
    }));

    throw new AppError('Validation failed', 400, details);
  }

  return instance;
};
