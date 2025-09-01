import { testDatabase } from './src/database';

async function runTest() {
  await testDatabase();
}

runTest();