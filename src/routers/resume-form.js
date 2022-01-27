//middlewares
const router = require('@koa/router')();

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const ResumeForm = require('../models/resume-form')


router.post('/resume-forms', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['step', 'name', 'titile', 'description', 'order']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }
  
  ctx.request.body.owner = ctx.user._id
  
  const resumeForm = new ResumeForm(ctx.request.body)

  await resumeForm.save()

  ctx.response.status = 201
  ctx.body = { resumeForm }
})

router.patch('/resume-forms/:id', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['step', 'name', 'titile', 'description', 'order']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const resumeForm = await ResumeForm.findById(ctx.params.id)
  if (resumeForm) {
    newProperties.forEach((property) => resumeForm[property] = ctx.request.body[property])
    await resumeForm.save()

    ctx.body = resumeForm;
  }
  else {
    var error = new Error('ResumeForm not found');
    error.status = 404
    throw error
  }
})

router.delete('/resume-forms/:id', authorize.forAdmin, async (ctx, next) => {
  const resumeForm = await ResumeForm.findById(ctx.params.id)
  if (resumeForm) {
    await resumeForm.remove()
    ctx.body = resumeForm;
  }
  else {
    var error = new Error('ResumeForm not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-forms', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await ResumeForm.find(null, null, { skip, limit })
})

router.get('/resume-forms/:id', authorize.forUser, async (ctx, next) => {
  const resumeForm = await ResumeForm.findById(ctx.params.id)
  if (resumeForm) {
    ctx.body = resumeForm;
  }
  else {
    var error = new Error('ResumeForm not found');
    error.status = 404
    throw error
  }
})

module.exports = router;