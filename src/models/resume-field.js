const mongoose = require('mongoose')

const resumeFieldSchema = new mongoose.Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ResumeForm'
    },
    name: {
        type: String,
        required: true,
        trim: true
        //TODO: validate that name is only letters and no space or '.' in it
        //TODO: when saving add '[step name].[form name].' to the name
    },
    type: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ResumeFieldType'
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ResumeField'
    },
    parent_order: {
        type: Number,
        required: true
    },
    subtype: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    hints: {
        type: String,
        trim: true
    },
    is_optional: {
        type: Boolean,
        required: true
    },
    is_required: {
        type: Boolean
    },
    is_required_err_message: {
        type: String,
        trim: true
    },
    is_persistent_data: {
        type: Boolean
    },
    is_collapsible: {
        type: Boolean
    },
    collapse_text: {
        type: String,
        trim: true
    },
    is_collapsible_by_default: {
        type: Boolean
    },
    regexs: {
        type: [String]
    },
    regexs_err_messages: {
        type: [String]
    },
    size: {
        type: String,
        trim: true
    },
    format: {
        type: String,
        trim: true
    },
    initial_value: {
        type: String,
        trim: true
    },
    suggested_values: {
        type: [{}],
        trim: true
    }
}, {
    timestamps: true
})

resumeFieldSchema.index({ form: 1, name: 1 }, { unique: true });

const ResumeField = mongoose.model('ResumeField', resumeFieldSchema)

module.exports = ResumeField