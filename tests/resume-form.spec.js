const request = require('supertest')

const app = require('../src/app')

const authenticate = require('../src/middlewares/authenticate')

const ResumeForm = require('../src/models/resume-form');
const ResumeStep = require('../src/models/resume-step');

const { initUser, initAdmin, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should return all forms', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    
    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get('/resume-forms').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve all
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-forms').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    const allForms = userResponse.body;
    expect(userResponse.body.length > 0).toBeTruthy();

    //test if retrieve all with limit
    userResponse = await request(server).get('/resume-forms?limit=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allForms[0]])

    //test if retrieve all with skip
    userResponse = await request(server).get('/resume-forms?skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject(allForms.slice(1))

    //test if retrieve all with limit and skip
    userResponse = await request(server).get('/resume-forms?limit=1&skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allForms[1]])
})

test('Should return form', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const form = await ResumeForm.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get(`/resume-forms/${form._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve none exists form
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-forms/61f1fe882529af0d43f6b85e').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(404)
    expect(userResponse.body.error).toBe('ResumeForm not found')

    //test if retrieve a form
    userResponse = await request(server).get(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    //TODO: check why date returned as string
    delete userResponse.body.createdAt
    delete userResponse.body.updatedAt
    const { __v, _id, step, name, title, description, order } = form
    expect(userResponse.body).toMatchObject({ __v, _id, step, name, title, description, order })
})

test('Should create form', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).post('/resume-forms').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed field
    userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test mandatory fields
    userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeForm validation failed: order: Path `order` is required., name: Path `name` is required., step: Path `step` is required.")

    userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeForm validation failed: name: Path `name` is required., step: Path `step` is required.")

    userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0,
            name: 'test'
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeForm validation failed: step: Path `step` is required.")

    // test creating field
    userResponse = await request(server).post('/resume-forms').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0,
            name: 'test',
            step: await ResumeStep.findOne()
        }
    ).expect(201)
    expect(userResponse.body.resumeForm).toMatchObject({
        order: 0,
        name: 'test',
        step: (await ResumeStep.findOne())._id,
        "__v": 0,
    })
})

test('Should update form', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const form = await ResumeForm.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).patch(`/resume-forms/${form._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).patch(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed form
    userResponse = await request(server).patch(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test patch not put
    userResponse = await request(server).patch(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "name": "new name"
    }).expect(200)
    expect(userResponse.body.name).toBe('new name')
})

test('Should delete form', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const form = await ResumeForm.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).delete(`/resume-forms/${form._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).delete(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user delete
    userResponse = await request(server).delete(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(200)
    
    //test if user delete not exists
    userResponse = await request(server).delete(`/resume-forms/${form._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(404)
})