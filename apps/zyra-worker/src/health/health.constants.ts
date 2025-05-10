import { AMQP_CONNECTION } from '../config';

export const RABBITMQ_HEALTH_PROVIDER = {
  provide: 'RABBITMQ_HEALTH_CONNECTION',
  useExisting: AMQP_CONNECTION,
};
