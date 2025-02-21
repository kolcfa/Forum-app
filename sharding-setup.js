require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const adminDb = client.db('admin');

    const dbName = 'advancedDB';
    const collectionName = `${dbName}.posts`;

    console.log(`Enabling sharding on database "${dbName}"...`);
    await adminDb.command({ enableSharding: dbName });

    console.log(`Sharding collection "${collectionName}" on key { author: 1 }...`);
    await adminDb.command({ shardCollection: collectionName, key: { author: 1 } });

    console.log("Sharding configured successfully.");
    await client.close();
  } catch (err) {
    console.error("Error during sharding setup:", err);
  }
})();
