import { POST } from '../src/app/api/offline-loan/route';
import { NextRequest } from 'next/server';

async function main() {
  console.log('Successfully imported POST!');
  console.log(typeof POST);
}

main().catch(console.error);
