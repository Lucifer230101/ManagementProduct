import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const server=app.listen(env.PORT,()=>console.log(`Backend listening on http://localhost:${env.PORT}`));
async function shutdown(signal:string){
  console.log(`${signal} received; shutting down`);
  server.close(async()=>{await pool.end();process.exit(0);});
  setTimeout(()=>process.exit(1),10_000).unref();
}
process.on('SIGINT',()=>void shutdown('SIGINT'));
process.on('SIGTERM',()=>void shutdown('SIGTERM'));