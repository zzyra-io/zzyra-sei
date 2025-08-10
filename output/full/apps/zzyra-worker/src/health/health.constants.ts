import { RabbitMQService } from '../services/rabbitmq.service';

export const RABBITMQ_HEALTH_PROVIDER = {
  provide: 'RABBITMQ_HEALTH_CONNECTION',
  useClass: RabbitMQService,
};
