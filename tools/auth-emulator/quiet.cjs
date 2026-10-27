// The official emulator normally prints email action links. Do not log them.
const { logger } = require('firebase-tools/lib/logger');
logger.silent = true;
process.env.CI = 'true';
process.env.FIREBASE_CLI_DISABLE_USAGE_REPORTING = 'true';
