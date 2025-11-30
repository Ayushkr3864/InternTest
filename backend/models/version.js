const mongoose = require("mongoose");
require("dotenv").config();
const db = process.env.MONGO_URI
console.log(db);

mongoose.connect(db)

const VersionSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  timestamp: {
    type: String,
    required: true,
  },
  addedWords: [String],
  removedWords: [String],
  oldLength: Number,
  newLength: Number,
  previousText: String,
  newText: String,
});

module.exports = mongoose.model("Version", VersionSchema);

