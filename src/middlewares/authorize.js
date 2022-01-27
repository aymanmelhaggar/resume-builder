const jwt = require('jsonwebtoken')
const User = require('../models/user')

const authorize = async (ctx, next, role) => {
  if (!ctx.user) {
    var error = new Error('User is not logged in');
    error.status = 401
    throw error
  }

  if (ctx.user.roles.indexOf('admin') == -1 && ctx.user.roles.indexOf(role) == -1) {
    ctx.response.status = 401
    ctx.body = { "error": "User is unauthorized to do this action" }
    return
  }

  await next()
}


module.exports = {
  forAdmin: async (ctx, next) => {
    await authorize(ctx, next, 'admin')
  },
  forUser: async (ctx, next) => {
    await authorize(ctx, next, 'user')
  }
}