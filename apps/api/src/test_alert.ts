import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import { checkAndDeliverAlerts } from './workers/alertWorker.js';

console.log("Triggering manual checkAndDeliverAlerts()...");
checkAndDeliverAlerts()
  .then(() => {
    console.log("Alert delivery check completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Alert delivery check failed:", err);
    process.exit(1);
  });
