//middlewares
const router = require('@koa/router')();

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const ResumeFieldType = require('../models/resume-field-type')


router.get('/resume-field-types', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await ResumeFieldType.find(null, null, { skip, limit })
})

module.exports = router;