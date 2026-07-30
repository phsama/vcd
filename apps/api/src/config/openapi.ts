import { DocumentBuilder } from '@nestjs/swagger';

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Você conhece Deus? — API')
    .setDescription(
      'API do app e do painel administrativo. Este documento é a fonte de verdade do contrato: ' +
        'gera o client Dart (mobile) e os tipos TS (admin) em packages/contracts.',
    )
    .setVersion('0.0.1')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'user')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'staff')
    .build();
}
