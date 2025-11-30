var express = require('express');
var router = express.Router();
var VersionModel = require("../models/version")
const {v4:uuidv4} = require("uuid")
const getWordDiff = require("../utils/getdiff")
const mongoose = require("mongoose")
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

const toWords = (text) => {
  return text.trim().split(/\s+/).filter(Boolean);
};

// POST /save-version
router.post("/save-version", async (req, res) => {
  try {
    const { newText } = req.body;

    if (!newText) {
      return res.status(400).json({ message: "newText is required" });
    }

    // Get last saved version
    const last = await VersionModel.findOne().sort({ timestamp: -1 });

    let previousText = last ? last.newText : "";
    let oldWords = toWords(previousText);
    let newWords = toWords(newText);

    // Detect added words
    let addedWords = newWords.filter((w) => !oldWords.includes(w));

    // Detect removed words
    let removedWords = oldWords.filter((w) => !newWords.includes(w));

    // Summary
    const summary = {
      id: new mongoose.Types.ObjectId().toString(),
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      addedWords,
      removedWords,
      oldLength: oldWords.length,
      newLength: newWords.length,
      previousText,
      newText,
    };

    // Save to DB
    const saved = await VersionModel.create(summary);

    res.json({
      message: "Version saved",
      data: saved,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/versions", async (req, res) => {
  try {
    const versions = await VersionModel.find().sort({ timestamp: -1 });

    res.json({
      success: true,
      count: versions.length,
      data: versions, // <── Must be "data"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// DELETE: /api/version/:id
router.delete("/version/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedVersion = await VersionModel.findByIdAndDelete(id);

    if (!deletedVersion) {
      return res.status(404).json({ message: "Version not found" });
    }

    res.json({ message: "Version deleted successfully", data: deletedVersion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
