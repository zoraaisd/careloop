import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AppError } from '../errors/app-error';

type ClassConstructor<T> = {
  new (): T;
};

const flattenValidationErrors = (
  errors: Array<{
    property: string;
    constraints?: Record<string, string>;
    children?: Array<any>;
  }>,
  parentPath = '',
): Array<{ field: string; constraints?: Record<string, string> }> => {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const current = error.constraints ? [{ field, constraints: error.constraints }] : [];
    const children = Array.isArray(error.children) && error.children.length > 0
      ? flattenValidationErrors(error.children, field)
      : [];

    return [...current, ...children];
  });
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
    const details = flattenValidationErrors(errors);

    throw new AppError('Validation failed', 400, details);
  }

  return instance;
};
