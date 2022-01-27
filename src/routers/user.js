//middlewares
const router = require('@koa/router')();
const multer = require('@koa/multer');
const { v4: uuidv4 } = require('uuid')
const sharp = require('sharp')

//custom middlewares
const authorize = require('../middlewares/authorize')

//models
const User = require('../models/user')

//middlewares configiurations
const upload = multer();

//User Actions
router.post('/users/register', async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'password', 'email']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  ctx.request.body.roles = ['user']

  const user = new User(ctx.request.body)

  await user.save()

  ctx.response.status = 201
  ctx.body = { user }
})

router.post('/users/login', async (ctx, next) => {
  const { email, password } = ctx.request.body

  if (!email || !password) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const user = await User.findByCredentials(email, password)
  const token = await user.generateAuthToken()

  ctx.session.token = token;

  ctx.body = { user, token }
})

router.post('/users/login-guest', async (ctx, next) => {
  if (ctx.user && ctx.user.roles.indexOf('admin') == -1) {

    ctx.body = { user: ctx.user, token: ctx.token }

    return
  }

  const newUser = new User({
    'name': 'Guest',
    'password': 'TempP@$$w0rd',
    'email': `guest-${uuidv4()}@dalialabs.com`,
    'roles': ['user', 'guest']
  })
  await newUser.save()

  const token = await newUser.generateAuthToken()

  ctx.session.token = token;

  ctx.body = { newUser, token }
})

router.get('/users/logout', authorize.forUser, async (ctx, next) => {
  ctx.user.tokens = ctx.user.tokens.filter((user_token) => {
    return user_token.token !== ctx.token
  })
  await ctx.user.save()

  ctx.session.token = undefined;

  ctx.response.status = 200
  ctx.body = { logout: 'success' }
})

router.get('/users/logout-all', authorize.forUser, async (ctx, next) => {
  ctx.user.tokens = []
  await ctx.user.save()

  ctx.session.token = undefined;

  ctx.response.status = 200
  ctx.body = { logout: 'success' }
})

router.get('/users/me', authorize.forUser, async (ctx, next) => {
  if (ctx.user) {
    ctx.body = ctx.user;
  }
  else {
    var error = new Error('User is not logged in');
    error.status = 404
    throw error
  }
})

router.patch('/users/me', authorize.forUser, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'password', 'email']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  newProperties.forEach((property) => ctx.user[property] = ctx.request.body[property])
  await ctx.user.save()

  ctx.body = ctx.user;
})



router.patch('/users/me/image', authorize.forUser, upload.fields([{ name: 'image', maxCount: 1 }]), async (ctx, next) => {
  //TODO: resize without distroing the image
  const buffer = await sharp(ctx.request.files.image[0].buffer).resize({ width: 250, height: 250 }).png().toBuffer()

  ctx.user.image = buffer

  await ctx.user.save()

  ctx.body = ctx.user
})

router.delete('/users/me/image', authorize.forUser, async (ctx, next) => {
  ctx.user.image = undefined

  await ctx.user.save()

  ctx.body = ctx.user
})

router.get('/users/me/image', authorize.forUser, async (ctx, next) => {
  if (!ctx.user.image) {
    return ctx.response.status = 404
  }

  ctx.set('Content-Type', 'image/png')

  ctx.body = ctx.user.image
})




//Admin Actions
router.post('/users', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'password', 'email', 'roles']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const user = new User(ctx.request.body)

  await user.save()

  ctx.response.status = 201
  ctx.body = { user }
})

router.patch('/users/:id', authorize.forAdmin, async (ctx, next) => {
  const newProperties = Object.keys(ctx.request.body)
  const allowedProperties = ['name', 'password', 'email', 'roles']
  const isValidOperation = newProperties.every((property) => allowedProperties.includes(property))

  if (!isValidOperation) {
    var error = new Error('Bad Request');
    error.status = 400
    throw error
  }

  const user = await User.findById(ctx.params.id)
  if (user) {
    newProperties.forEach((property) => user[property] = ctx.request.body[property])
    await user.save()

    ctx.body = user;
  }
  else {
    var error = new Error('User not found');
    error.status = 404
    throw error
  }
})

router.delete('/users/:id', authorize.forAdmin, async (ctx, next) => {
  const user = await User.findById(ctx.params.id)
  if (user) {
    await user.remove()
    ctx.body = user;
  }
  else {
    var error = new Error('User not found');
    error.status = 404
    throw error
  }
})

router.get('/users', authorize.forAdmin, async (ctx, next) => {
  var { limit, skip } = ctx.request.query

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(limit) || limit < 0) limit = 0;

  ctx.body = await User.find(ctx.request.body, null, { skip, limit })
})

router.patch('/users/:id/image', authorize.forAdmin, upload.fields([{ name: 'image', maxCount: 1 }]), async (ctx, next) => {
  const user = await User.findById(ctx.params.id)
  if (user) {
    //TODO: resize without distroing the image
    const buffer = await sharp(ctx.request.files.image[0].buffer).resize({ width: 250, height: 250 }).png().toBuffer()

    user.image = buffer

    await user.save()

    ctx.body = user
  }
  else {
    var error = new Error('User not found');
    error.status = 404
    throw error
  }
})

router.delete('/users/:id/image', authorize.forAdmin, async (ctx, next) => {
  const user = await User.findById(ctx.params.id)
  if (user) {
    user.image = undefined

    await user.save()

    ctx.body = user
  }
  else {
    var error = new Error('User not found');
    error.status = 404
    throw error
  }
})

router.get('/users/:id/image', authorize.forAdmin, async (ctx, next) => {
  const user = await User.findById(ctx.params.id)
  if (user) {
    if (!user.image) {
      return ctx.response.status = 404
    }

    ctx.set('Content-Type', 'image/png')

    ctx.body = user.image
  }
  else {
    var error = new Error('User not found');
    error.status = 404
    throw error
  }
})




module.exports = router;