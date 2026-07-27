import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '..', 'services');

// Find all main.ts files that use the old KafkaProducer/OutboxWorker pattern
const serviceDirs = fs.readdirSync(servicesDir).filter(d => {
  const mainPath = path.join(servicesDir, d, 'src', 'main.ts');
  return fs.existsSync(mainPath);
});

let fixed = 0;
let skipped = 0;

for (const svc of serviceDirs) {
  const mainPath = path.join(servicesDir, svc, 'src', 'main.ts');
  let content = fs.readFileSync(mainPath, 'utf-8');
  const original = content;

  // Skip if already uses new pattern (KafkaProducer with 2 args and OutboxWorker with config object)
  if (content.includes('new KafkaProducer(') && content.includes('logger') && 
      content.includes('new OutboxWorker({') && content.includes('producerName')) {
    // Already fixed
    skipped++;
    continue;
  }

  // Only fix files with old pattern
  if (!content.includes('new KafkaProducer({') || !content.includes('new OutboxWorker(dataSource,')) {
    skipped++;
    continue;
  }

  // Extract clientId from: new KafkaProducer({ brokers: kafkaBrokers, clientId: 'XXX' })
  const clientIdMatch = content.match(/new KafkaProducer\(\{\s*brokers:\s*kafkaBrokers,\s*clientId:\s*'([^']+)'\s*\}\)/);
  if (!clientIdMatch) {
    console.log(`SKIP ${svc}: could not find clientId pattern`);
    skipped++;
    continue;
  }
  const clientId = clientIdMatch[1];
  const serviceName = clientId;

  // 1. Add createLogger to the dynamic import
  content = content.replace(
    "const { KafkaProducer, OutboxWorker } = await import('@insurance/shared');",
    "const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');"
  );

  // 2. Replace inline logger object with createLogger
  const inlineLoggerPattern = /const logger = \{\s*\n\s*info: \(msg: string, meta\?: any\) => console\.log\('OutboxWorker:', msg, meta \|\| ''\),\s*\n\s*error: \(msg: string, meta\?: any\) => console\.error\('OutboxWorker:', msg, meta \|\| ''\),\s*\n\s*warn: \(msg: string, meta\?: any\) => console\.warn\('OutboxWorker:', msg, meta \|\| ''\),\s*\n\s*debug: \(msg: string, meta\?: any\) => \{\},\s*\n\s*\};/;
  content = content.replace(inlineLoggerPattern, `const logger = createLogger({ serviceName: '${serviceName}', level: process.env.LOG_LEVEL || 'info' });`);

  // 3. Add logger as second arg to KafkaProducer
  content = content.replace(
    `new KafkaProducer({ brokers: kafkaBrokers, clientId: '${clientId}' })`,
    `new KafkaProducer({ brokers: kafkaBrokers, clientId: '${clientId}' }, logger)`
  );

  // 4. Replace old OutboxWorker(dataSource, kafkaProducer, { ... }, logger as any) with new config object pattern
  // Match: new OutboxWorker(dataSource, kafkaProducer, {
  //   pollIntervalMs: ...,
  //   batchSize: ...,
  //   maxAttempts: ...,
  // }, logger as any);
  const oldOutboxPattern = /new OutboxWorker\(dataSource, kafkaProducer, \{\s*\n\s*pollIntervalMs: parseInt\(process\.env\.OUTBOX_POLL_INTERVAL_MS \|\| '5000', 10\),\s*\n\s*batchSize: parseInt\(process\.env\.OUTBOX_BATCH_SIZE \|\| '50', 10\),\s*\n\s*maxAttempts: parseInt\(process\.env\.OUTBOX_MAX_ATTEMPTS \|\| '5', 10\),\s*\n\s*\}, logger as any\);/;
  
  const newOutbox = `new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: '${serviceName}',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });`;
  
  content = content.replace(oldOutboxPattern, newOutbox);

  if (content !== original) {
    fs.writeFileSync(mainPath, content, 'utf-8');
    console.log(`FIXED ${svc}`);
    fixed++;
  } else {
    console.log(`SKIP ${svc}: no changes made (pattern may differ)`);
    skipped++;
  }
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
