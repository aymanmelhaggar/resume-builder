const jwt = require('jsonwebtoken')
const User = require('../models/user')

module.exports = async (ctx, next) => {
  ctx.user = null;
  ctx.token = null;
  
  if (ctx.session.token || ctx.request.headers.authorization) {
    var headerToken = ctx.request.headers.authorization;
    if (headerToken && headerToken.length > 7) headerToken = headerToken.substr(7)

    const token = headerToken || ctx.session.token

    try {
      const user = await User.findByToken(token)

      ctx.user = user;
      ctx.token = token;
    }
    catch { }
  }
  

  await next()
}