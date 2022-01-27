const mongoose = require('mongoose')

const resumeSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    template: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ResumeTemplate'
    },
    template_color: {
        type: String,
        trim: true
    },
    current_form: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ResumeForm'
    },
    data: {
        type: {},
        required: true
    }
}, {
    timestamps: true
})

const Resume = mongoose.model('Resume', resumeSchema)

module.exports = Resume