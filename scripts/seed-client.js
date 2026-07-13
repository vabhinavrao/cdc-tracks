'use strict';

const crypto = require('crypto');
const db = require('../src/db/pool');

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function seed() {
  const clientName = 'CDC Portal';
  const apiKey = 'cdc_api_key_for_local_testing_54321';
  const prefix = apiKey.substring(0, 8);
  const hash = hashKey(apiKey);

  console.log(`Seeding client: "${clientName}"`);
  console.log(`API Key: "${apiKey}"`);
  console.log(`Prefix: "${prefix}"`);
  console.log(`Hash: "${hash}"`);

  try {
    // 1. Insert api_client
    const clientRes = await db.query(
      `INSERT INTO api_clients (name, status) 
       VALUES ($1, 'active') 
       ON CONFLICT DO NOTHING 
       RETURNING id`,
      [clientName]
    );

    let clientId;
    if (clientRes.rows.length > 0) {
      clientId = clientRes.rows[0].id;
      console.log(`Created new client with ID: ${clientId}`);
    } else {
      const existing = await db.query(`SELECT id FROM api_clients WHERE name = $1`, [clientName]);
      clientId = existing.rows[0].id;
      console.log(`Found existing client with ID: ${clientId}`);
    }

    // 2. Insert api_key
    await db.query(
      `INSERT INTO api_keys (client_id, key_prefix, key_hash, scopes) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT DO NOTHING`,
      [clientId, prefix, hash, ['read', 'register', 'refresh']]
    );
    console.log('Seeded API key successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed API key:', err);
    process.exit(1);
  }
}

seed();
