const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    persistent_data: {
        type: {}
    },
    roles: {
        type: [String],
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        validate(value) {
            if (!validator.isStrongPassword(value, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
                throw new Error('Password is not strong, minimum length is 8, minimum lowercase is 1, minimum uppercase is 1, minimum numbers is 1, minimum symbols is 1')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    image: {
        type: Buffer
    }
}, {
    timestamps: true
})

userSchema.virtual('resumes', {
    ref: 'Resume',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.image

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this

    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })

    if (!user) {
        var error = new Error('Invalid email or password')
        error.status = 401
        throw error
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        var error = new Error('Invalid email or password')
        error.status = 401
        throw error
    }

    return user
}

userSchema.statics.findByToken = async (token) => {
    const token_decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findOne({ _id: token_decoded._id, 'tokens.token': token })

    if (!user) {
        var error = new Error(`Invalid token "${token}"`)
        error.status = 401
        throw error
    }

    return user
}

userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User