//middlewares
const router = require('@koa/router')();

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const ResumeField = require('../models/resume-field')


router.post('/resume-fields', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['form', 'name', 'type', 'parent', 'parent_order', 'subtype', 'title', 'hints', 'is_optional', 'is_required', 'is_required_err_message', 'is_persistent_data', 'is_collapsible', 'collapse_text', 'is_collapsible_by_default', 'regexs', 'regexs_err_messages', 'size', 'format', 'initial_value', 'suggested_values']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }
  
  ctx.request.body.owner = ctx.user._id
  
  const resumeField = new ResumeField(ctx.request.body)

  await resumeField.save()

  ctx.response.status = 201
  ctx.body = { resumeField }
})

router.patch('/resume-fields/:id', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['form', 'name', 'type', 'parent', 'parent_order', 'subtype', 'title', 'hints', 'is_optional', 'is_required', 'is_required_err_message', 'is_persistent_data', 'is_collapsible', 'collapse_text', 'is_collapsible_by_default', 'regexs', 'regexs_err_messages', 'size', 'format', 'initial_value', 'suggested_values']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const resumeField = await ResumeField.findById(ctx.params.id)
  if (resumeField) {
    newProperties.forEach((property) => resumeField[property] = ctx.request.body[property])
    await resumeField.save()

    ctx.body = resumeField;
  }
  else {
    var error = new Error('ResumeField not found');
    error.status = 404
    throw error
  }
})

router.delete('/resume-fields/:id', authorize.forAdmin, async (ctx, next) => {
  const resumeField = await ResumeField.findById(ctx.params.id)
  if (resumeField) {
    await resumeField.remove()
    ctx.body = resumeField;
  }
  else {
    var error = new Error('ResumeField not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-fields', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await ResumeField.find(null, null, { skip, limit })
})

router.get('/resume-fields/:id', authorize.forUser, async (ctx, next) => {
  const resumeField = await ResumeField.findById(ctx.params.id)
  if (resumeField) {
    ctx.body = resumeField;
  }
  else {
    var error = new Error('ResumeField not found');
    error.status = 404
    throw error
  }
})

module.exports = router;