const mongoose = require('mongoose')

const resumeStepSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    title: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    is_optional: {
        type: Boolean,
        required: true
    },
    order: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
})

resumeStepSchema.virtual('forms', {
    ref: 'ResumeForm',
    localField: '_id',
    foreignField: 'step'
})

const ResumeStep = mongoose.model('ResumeStep', resumeStepSchema)

module.exports = ResumeStep