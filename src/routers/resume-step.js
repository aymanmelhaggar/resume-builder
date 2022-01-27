//middlewares
const router = require('@koa/router')();

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const ResumeStep = require('../models/resume-step')


router.post('/resume-steps', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'title', 'is_optional', 'order']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }
  
  ctx.request.body.owner = ctx.user._id
  
  const resumeStep = new ResumeStep(ctx.request.body)

  await resumeStep.save()

  ctx.response.status = 201
  ctx.body = { resumeStep }
})

router.patch('/resume-steps/:id', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'title', 'is_optional', 'order']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const resumeStep = await ResumeStep.findById(ctx.params.id)
  if (resumeStep) {
    newProperties.forEach((property) => resumeStep[property] = ctx.request.body[property])
    await resumeStep.save()

    ctx.body = resumeStep;
  }
  else {
    var error = new Error('ResumeStep not found');
    error.status = 404
    throw error
  }
})

router.delete('/resume-steps/:id', authorize.forAdmin, async (ctx, next) => {
  const resumeStep = await ResumeStep.findById(ctx.params.id)
  if (resumeStep) {
    await resumeStep.remove()
    ctx.body = resumeStep;
  }
  else {
    var error = new Error('ResumeStep not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-steps/:id', authorize.forUser, async (ctx, next) => {
  const resumeStep = await ResumeStep.findById(ctx.params.id)
  if (resumeStep) {
    ctx.body = resumeStep;
  }
  else {
    var error = new Error('ResumeStep not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-steps', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await ResumeStep.find(null, null, { skip, limit })
})

module.exports = router;