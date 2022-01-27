//middlewares
const router = require('@koa/router')();

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const ResumeTemplate = require('../models/resume-template')


router.post('/resume-templates', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['template', 'template_color', 'current_form', 'top_form', 'data']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }
  
  ctx.request.body.owner = ctx.user._id
  
  const resumeTemplate = new ResumeTemplate(ctx.request.body)

  await resumeTemplate.save()

  ctx.response.status = 201
  ctx.body = { resumeTemplate }
})

router.patch('/resume-templates/:id', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'title', 'description', 'preview_data', 'html_template', 'keywords']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const resumeTemplate = await ResumeTemplate.findById(ctx.params.id)
  if (resumeTemplate) {
    newProperties.forEach((property) => resumeTemplate[property] = ctx.request.body[property])
    await resumeTemplate.save()

    ctx.body = resumeTemplate;
  }
  else {
    var error = new Error('ResumeTemplate not found');
    error.status = 404
    throw error
  }
})

router.delete('/resume-templates/:id', authorize.forAdmin, async (ctx, next) => {
  const resumeTemplate = await ResumeTemplate.findById(ctx.params.id)
  if (resumeTemplate) {
    await resumeTemplate.remove()
    ctx.body = resumeTemplate;
  }
  else {
    var error = new Error('ResumeTemplate not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-templates', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await ResumeTemplate.find(null, null, { skip, limit })
})

router.get('/resume-templates/:id', authorize.forUser, async (ctx, next) => {
  const resumeTemplate = await ResumeTemplate.findById(ctx.params.id)
  if (resumeTemplate) {
    ctx.body = resumeTemplate;
  }
  else {
    var error = new Error('ResumeTemplate not found');
    error.status = 404
    throw error
  }
})

router.get('/resume-templates/:id/html', authorize.forUser, async (ctx, next) => {
  const resumeTemplate = await ResumeTemplate.findById(ctx.params.id)
  if (resumeTemplate) {
    resumeTemplate.html_template = await ResumeTemplate.resolve(resumeTemplate.html_template, resumeTemplate.preview_data)
    ctx.body = resumeTemplate.html_template;
  }
  else {
    var error = new Error('ResumeTemplate not found');
    error.status = 404
    throw error
  }
})

router.post('/resume-templates/validate', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['html']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation || !ctx.request.body.html) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  ctx.response.status = 200
  ctx.body = await ResumeTemplate.validate(ctx.request.body.html)
})


module.exports = router;