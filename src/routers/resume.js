//middlewares
const router = require('@koa/router')();
var html_to_pdf = require('html-pdf-node');

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const Resume = require('../models/resume')
const ResumeTemplate = require('../models/resume-template')
const ResumeField = require('../models/resume-field')
const ResumeForm = require('../models/resume-form')


router.get('/resumes', authorize.forUser, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  if (ctx.user.roles.indexOf('user') != -1)
    ctx.body = await Resume.find({ owner: ctx.user._id }, null, { skip, limit })
  else if (ctx.user.roles.indexOf('admin') != -1)
    ctx.body = await Resume.find(null, null, { skip, limit })
})

router.post('/resumes', authorize.forUser, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['template', 'template_color']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const forms = await ResumeForm.find({}).sort('order').exec();
  if (forms.length == 0) {
    throw Error("Please ask an admin to create forms first");
  }

  ctx.request.body.owner = ctx.user._id
  ctx.request.body.current_form = forms[0];
  ctx.request.body.is_current_form_valid = false;
  ctx.request.body.data = {
    "Template.Theme.Color": ctx.request.body.template_color
  }
  const persistenProperties = Object.keys(ctx.user.persistent_data)
  for(var i = 0; i < persistenProperties.length; i++)
    ctx.request.body.data[persistenProperties[i]] = ctx.user.persistent_data[persistenProperties[i]]
  

  const resume = new Resume(ctx.request.body)
  await resume.save()

  ctx.response.status = 201
  ctx.body = { resume }
})

router.patch('/resumes/:id/data/:form_id', authorize.forUser, async (ctx, next) => {
  var form = undefined
  if (ctx.params.form_id) {
    form = await ResumeForm.findById(ctx.params.form_id).populate('fields').exec()
    if (!form) {
      var error = new Error('Form not found');
      error.status = 404
      throw error
    }
  }

  var resume = undefined
  if (ctx.user.roles.indexOf('user') != -1)
    if (form)
      resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id })
    else {
      resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id }).populate({
        path: 'current_form',
        populate: {
          path: 'fields',
        }
      }).exec()
      form = resume.current_form;
    }
  else if (ctx.user.roles.indexOf('admin') != -1)
    if (form)
      resume = await Resume.findOne({ _id: ctx.params.id })
    else {
      resume = await Resume.findOne({ _id: ctx.params.id }).populate({
        path: 'current_form',
        populate: {
          path: 'fields',
        }
      }).exec()
      form = resume.current_form;
    }

  if (resume) {
    var errors = []
    var persistent_data = {}

    const properties = Object.keys(ctx.request.body)
    for (var i = 0; i < properties.length; i++) {
      const property = properties[i];

      const field = await ResumeField.findOne({ name: property }).populate('type').exec()
      if(!field) continue;
      
      const isArray = Array.isArray(ctx.request.body[property])

      if (field.type.name == 'List' && !isArray) {
        errors.push({ property, errors: ["Expected a List []"], index: undefined })
        continue
      }

      if (field.is_required && !ctx.request.body[property]) {
        errors.push({ property, errors: [field.is_required_err_message ? field.is_required_err_message : "Field is required"], index: undefined })
      }

      if (field.regexs.length > 0 && ctx.request.body[property]) {
        var regexErrors = []
        for (var ri = 0; ri < field.regexs.length; ri++) {
          try {
            if (!new RegExp(field.regexs[ri]).test(ctx.request.body[property]))
              regexErrors.push(field.regexs_err_messages[ri])
          }
          catch (err) {
            regexErrors.push(err.message)
          }
        }
        if (regexErrors.length > 0) errors.push({ property, errors: [regexErrors], index: undefined })

        //TODO: validate list items
      }

      if (field.is_persistent_data) {
        persistent_data[property] = ctx.request.body[property]
      }
    }

    for (var i = 0; i < form.fields.length; i++) {
      const property = form.fields[i].name;
      const field = form.fields[i]
      const isArray = Array.isArray(ctx.request.body[property])

      if (field.is_required && !ctx.request.body[property]) {
        errors.push({ property, errors: [field.is_required_err_message ? field.is_required_err_message : "Field is required"], index: undefined })
      }

      //TODO: validate list items
    }

    if (errors.length == 0) {
      ctx.user.persistent_data = persistent_data;
      ctx.user.markModified('persistent_data')
      ctx.user.save()

      resume.data = ctx.request.body;
      resume.markModified('data')
      resume.save()

      ctx.response.status = 201
    }
    else ctx.response.status = 400
    ctx.body = errors
  }
  else {
    var error = new Error('Resume not found');
    error.status = 404
    throw error
  }
})

router.patch('/resumes/:id', authorize.forUser, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['template', 'template_color', 'current_form']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  var resume = undefined
  if (ctx.user.roles.indexOf('user') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id })
  else if (ctx.user.roles.indexOf('admin') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id })

  if (resume) {
    newProperties.forEach((property) => resume[property] = ctx.request.body[property])

    resume.data["Template.Theme.Color"] = ctx.request.body.template_color
    resume.markModified('data');

    await resume.save()

    ctx.body = resume;
  }
  else {
    var error = new Error('Resume not found');
    error.status = 404
    throw error
  }
})

router.delete('/resumes/:id', authorize.forUser, async (ctx, next) => {
  var resume = undefined
  if (ctx.user.roles.indexOf('user') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id })
  else if (ctx.user.roles.indexOf('admin') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id })

  if (resume) {
    await resume.remove()
    ctx.body = resume;
  }
  else {
    var error = new Error('Resume not found');
    error.status = 404
    throw error
  }
})

router.get('/resumes/:id/html', authorize.forUser, async (ctx, next) => {
  var resume = undefined
  if (ctx.user.roles.indexOf('user') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id })
  else if (ctx.user.roles.indexOf('admin') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id })

  if (resume) {
    const resumeTemplate = await ResumeTemplate.findById(resume.template)
    if (resumeTemplate) {
      ctx.body = await ResumeTemplate.resolve(resumeTemplate.html_template, resume.data)
    }
    else {
      var error = new Error('ResumeTemplate not found');
      error.status = 404
      throw error
    }
  }
  else {
    var error = new Error('Resume not found');
    error.status = 404
    throw error
  }
})

router.get('/resumes/:id/pdf', authorize.forUser, async (ctx, next) => {
  var resume = undefined
  if (ctx.user.roles.indexOf('user') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id, owner: ctx.user._id }).populate('owner').exec()
  else if (ctx.user.roles.indexOf('admin') != -1)
    resume = await Resume.findOne({ _id: ctx.params.id }).populate('owner').exec()

  if (resume) {
    const resumeTemplate = await ResumeTemplate.findById(resume.template)
    if (resumeTemplate) {
      const html_template = await ResumeTemplate.resolve(resumeTemplate.html_template, resume.data)

      var options = { format: 'A4', printBackground: true };
      var file = { content: html_template };

      const pdfBuffer = await html_to_pdf.generatePdf(file, options)

      ctx.attachment(`${resume.owner.name} CV.pdf`);
      ctx.type = 'application/pdf';
      ctx.body = pdfBuffer;
    }
    else {
      var error = new Error('ResumeTemplate not found');
      error.status = 404
      throw error
    }
  }
  else {
    var error = new Error('Resume not found');
    error.status = 404
    throw error
  }
})


module.exports = router;