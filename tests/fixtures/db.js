const mongoose = require('mongoose')

const ResumeFieldType = require('../../src/models/resume-field-type')
const ResumeField = require('../../src/models/resume-field')
const ResumeForm = require('../../src/models/resume-form')
const ResumeStep = require('../../src/models/resume-step')
const ResumeTemplate = require('../../src/models/resume-template')
const Resume = require('../../src/models/resume')
const User = require('../../src/models/user')

const setupDatabase = async () => {
    await ResumeFieldType.deleteMany()
    await ResumeField.deleteMany()
    await ResumeForm.deleteMany()
    await ResumeStep.deleteMany()
    await ResumeTemplate.deleteMany()
    await Resume.deleteMany()
    await User.deleteMany()
}

const initAdmin = async () => {
    var user = await User.findOne({ 'email': 'admin@dalialabs.com' })
    if (!user) {
        user = new User({
            'name': 'admin',
            'roles': ['admin'],
            'email': 'admin@dalialabs.com',
            'password': 'P@$$w0rd',
        })
        await user.save()
    }

    return user
}

const initUser = async () => {
    var user = await User.findOne({ 'email': 'user@dalialabs.com' })
    if (!user) {
        user = new User({
            'name': 'user',
            'roles': ['user'],
            'email': 'user@dalialabs.com',
            'password': 'P@$$w0rd'
        })
        await user.save()
    }

    return user
}


module.exports = {
    setupDatabase,
    initAdmin,
    initUser
}