const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function importData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const sourceDb = mongoose.connection.useDb('chess_project');
    const targetDb = mongoose.connection.useDb('chessData');

    const sourceCount = await sourceDb.db.collection('chessData').countDocuments();
    console.log(`Source documents: ${sourceCount}`);

    await targetDb.db.collection('matches').deleteMany({});
    console.log('Cleared existing matches collection');

    const BATCH_SIZE = 500;
    let totalInserted = 0;
    let totalSkipped = 0;
    let skip = 0;

    while (true) {
      const batch = await sourceDb.db.collection('chessData')
        .find({})
        .skip(skip)
        .limit(BATCH_SIZE)
        .toArray();

      if (batch.length === 0) break;

      const docs = batch.map(doc => ({
        id: doc.id,
        rated: doc.rated,
        created_at: String(doc.created_at),
        last_move_at: String(doc.last_move_at),
        turns: String(doc.turns),
        victory_status: doc.victory_status,
        winner: doc.winner,
        increment_code: doc.increment_code,
        white_id: doc.white_id,
        white_rating: String(doc.white_rating),
        black_id: doc.black_id,
        black_rating: String(doc.black_rating),
        moves: doc.moves,
        opening_eco: doc.opening_eco,
        opening_name: doc.opening_name,
        opening_ply: String(doc.opening_ply),
        isArchived: false,
        isDeleted: false,
      }));

      try {
        const result = await targetDb.db.collection('matches').insertMany(docs, { ordered: false });
        totalInserted += result.insertedCount;
      } catch (err) {
        if (err.insertedCount) {
          totalInserted += err.insertedCount;
        }
        totalSkipped += (docs.length - (err.insertedCount || 0));
      }

      skip += BATCH_SIZE;
      console.log(`Progress: ${totalInserted} inserted, ${totalSkipped} skipped (${skip}/${sourceCount})`);
    }

    const finalCount = await targetDb.db.collection('matches').countDocuments();
    console.log(`\nDone! Total matches in database: ${finalCount}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importData();
