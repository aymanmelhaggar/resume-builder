const mongoose = require('mongoose')

const resumeFormSchema = new mongoose.Schema({
    step: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ResumeStep'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    order: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
})

resumeFormSchema.virtual('fields', {
    ref: 'ResumeField',
    localField: '_id',
    foreignField: 'form'
})

resumeFormSchema.index({ step: 1, name: 1 }, { unique: true });

const ResumeForm = mongoose.model('ResumeForm', resumeFormSchema)

module.exports = ResumeForm