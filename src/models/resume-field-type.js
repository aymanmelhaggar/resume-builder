const mongoose = require('mongoose')

const resumeFieldTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        trim: true
    }
}, {
    timestamps: true
})

const ResumeFieldType = mongoose.model('ResumeFieldType', resumeFieldTypeSchema)

module.exports = ResumeFieldType