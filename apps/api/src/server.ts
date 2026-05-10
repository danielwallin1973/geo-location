import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { env } from './env.js';
import { pool } from './db.js';
import { poisRoutes } from './routes/pois.js';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: false,
  });

  // Healthcheck – används av load balancer.
  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  await app.register(poisRoutes, { prefix: '/api' });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown – viktigt när vi kör bakom load balancer.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down...`);
      await app.close();
      await pool.end();
      process.exit(0);
    });
  }
}

main();
