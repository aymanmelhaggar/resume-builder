const mongoose = require('mongoose')

module.exports = async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        if (err instanceof mongoose.Error.ValidationError || err.message.indexOf("duplicate key error") != -1) ctx.response.status = 400
        else ctx.response.status = err.statusCode || err.status || 500
        ctx.body = { "error": err.message }
    }
}