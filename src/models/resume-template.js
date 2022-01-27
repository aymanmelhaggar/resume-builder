const mongoose = require('mongoose')
const ResumeField = require('../models/resume-field')

const resumeTemplateSchema = new mongoose.Schema({
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
    description: {
        type: String,
        trim: true
    },
    preview_data: {
        type: {},
        required: true
    },
    html_template: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: async (value) => {
                var result = await ResumeTemplate.validate(value)
                return result.errors.length == 0;
            },
            message: (props) => `value is not valid, please validate it first`,
        }
    },
    keywords: {
        type: [String],
        trim: true
    }
}, {
    timestamps: true
})

resumeTemplateSchema.statics.resolve = async (template, data, list_index) => {
    var html = ""

    var lastCommandEndIndex = 0;
    var currentCommandIndex = 0;

    const commands = await getCommands(template)
    if (commands.length == 0) return template;
    do {
        const command = commands[currentCommandIndex]

        if (command.start_index > lastCommandEndIndex) {
            html += template.substr(lastCommandEndIndex, command.start_index - lastCommandEndIndex)
            lastCommandEndIndex = command.end_index

            var fieldValue = undefined;
            if (list_index == undefined) {
                fieldValue = data[command.field]
            }
            else {
                const list_name = command.field.substr(0, command.field.lastIndexOf('.'))

                if (data[list_name][list_index][command.field] != undefined) {
                    fieldValue = data[list_name][list_index][command.field]
                }
            }

            // check field exists
            if (command.command == "Exists" && fieldValue) {
                html += await ResumeTemplate.resolve(command.command_block.substr(command.command_start.length).slice(0, -1 * command.command_end.length), data, list_index)
            }
            // check form exists
            else if (command.command == "Exists" && !command.field && Object.keys(data).some((property) => property.indexOf(command.form) != -1)) {
                html += await ResumeTemplate.resolve(command.command_block.substr(command.command_start.length).slice(0, -1 * command.command_end.length), data, list_index)
            }
            // check field not exists
            else if (command.command == "NotExists" && !fieldValue) {
                html += await ResumeTemplate.resolve(command.command_block.substr(command.command_start.length).slice(0, -1 * command.command_end.length), data, list_index)
            }
            // check form not exists
            else if (command.command == "NotExists" && !command.field && !Object.keys(data).some((property) => property.indexOf(command.form) != -1)) {
                html += await ResumeTemplate.resolve(command.command_block.substr(command.command_start.length).slice(0, -1 * command.command_end.length), data, list_index)
            }
            // set field value
            else if (command.command == "Value" && fieldValue) {
                html += fieldValue
            }
            // handle lists foreachin
            else if (command.command == "ForEachIn" && data[command.field]) {
                for (var i = 0; i < data[command.field].length; i++) {
                    html += await ResumeTemplate.resolve(command.command_block.substr(command.command_start.length).slice(0, -1 * command.command_end.length), data, i)
                }

            }
        }

        currentCommandIndex++;
    }
    while (currentCommandIndex < commands.length)

    if (lastCommandEndIndex < template.length - 1)
        html += template.substr(lastCommandEndIndex)

    return html
}

resumeTemplateSchema.statics.validate = async (html) => {
    var errors = []
    var allowedCommands = ["Exists", "NotExists", "Value", "ForEachIn"]

    const commands = await getCommands(html)
    for (var i = 0; i < commands.length; i++) {

        //check that all are supported commands
        if (allowedCommands.indexOf(commands[i].command) == -1) {
            errors.push({
                error: "Command is not supported",
                details: commands[i].command
            })
        }

        //check that all fields are exists
        const field = await ResumeField.findOne({ name: commands[i].field }).populate('type').exec()
        if (field == null && commands[i].field != null && commands[i].field != 'Template.Theme.Color') {
            errors.push({
                error: "Field is not found",
                details: commands[i]
            })
        }

        //check that all foreachin are for list fields
        if (field != null && commands[i].command == "ForEachIn" && field.type.name != "List") {
            errors.push({
                error: "ForEachIn command used only with lists",
                details: commands[i]
            })
        }

        //check that all commands that has open and close comment has close comment
        if (["Exists", "NotExists", "ForEachIn"].indexOf(commands[i].command) != -1 && !commands[i].command_end) {
            errors.push({
                error: "Close command not found",
                details: commands[i]
            })
        }

        //check that all commands that has open and close comment has close comment
        if (["Value"].indexOf(commands[i].command) != -1 && commands[i].command_end) {
            errors.push({
                error: "Command not support closing",
                details: commands[i]
            })
        }

        //TODO: check for internal not closed commands
    }

    return { errors }
}

const getCommands = async (html) => {
    var commands = []

    var index = html.indexOf('<!--[');
    while (index != -1) {
        const start_index = index
        var end_command_start = html.indexOf('-->', index);
        if (end_command_start != -1) end_command_start += 3
        const command_start = html.substr(index, end_command_start - index)

        if (command_start.indexOf('<!--[End') == 0) {
            index = html.indexOf('<!--[', index + 1)
            continue;
        }

        const command = command_start.split(':')[0].substr(5)

        const field_data = command_start.split(':')[1].slice(0, -4).split('.');

        var field = undefined
        if (field_data.length > 2)
            field = command_start.split(':')[1].slice(0, -4)

        const form = field_data[0] + '.' + field_data[1]

        var end_index = html.indexOf(`<!--[End${command}:${field ? field : form}]-->`);
        var command_end = undefined
        var command_block = undefined
        if (end_index != -1) {
            end_index += `<!--[End${command}:${field ? field : form}]-->`.length
            command_end = `<!--[End${command}:${field ? field : form}]-->`
            command_block = html.substr(start_index, end_index - start_index)
        }
        else end_index = start_index + command_start.length

        commands.push({
            command,
            command_start,
            command_end,
            form,
            field,
            start_index,
            end_index,
            command_block
        });
        index = html.indexOf('<!--[', index + 1)
    }

    return commands;
}

const ResumeTemplate = mongoose.model('ResumeTemplate', resumeTemplateSchema)

module.exports = ResumeTemplate