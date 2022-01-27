const request = require('supertest')

const app = require('../src/app')

const authenticate = require('../src/middlewares/authenticate')

const ResumeStep = require('../src/models/resume-step');

const { initUser, initAdmin, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should return all steps', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    
    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get('/resume-steps').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve all
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-steps').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    const allSteps = userResponse.body;
    expect(userResponse.body.length > 0).toBeTruthy();

    //test if retrieve all with limit
    userResponse = await request(server).get('/resume-steps?limit=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allSteps[0]])

    //test if retrieve all with skip
    userResponse = await request(server).get('/resume-steps?skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject(allSteps.slice(1))

    //test if retrieve all with limit and skip
    userResponse = await request(server).get('/resume-steps?limit=1&skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allSteps[1]])
})

test('Should return step', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const step = await ResumeStep.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get(`/resume-steps/${step._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve none exists step
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-steps/61f1fe882529af0d43f6b85e').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(404)
    expect(userResponse.body.error).toBe('ResumeStep not found')

    //test if retrieve a step
    userResponse = await request(server).get(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    //TODO: check why date returned as string
    delete userResponse.body.createdAt
    delete userResponse.body.updatedAt
    const { __v, _id, name, title, is_optional, order } = step
    expect(userResponse.body).toMatchObject({ __v, _id, name, title, is_optional, order })
})

test('Should create step', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).post('/resume-steps').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed step
    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test mandatory fields
    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeStep validation failed: order: Path `order` is required., is_optional: Path `is_optional` is required., title: Path `title` is required., name: Path `name` is required.")

    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeStep validation failed: is_optional: Path `is_optional` is required., title: Path `title` is required., name: Path `name` is required.")

    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0,
            is_optional: false
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeStep validation failed: title: Path `title` is required., name: Path `name` is required.")

    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0,
            is_optional: false,
            title: 'test'
        }
    ).expect(400)
    expect(userResponse.body.error).toBe("ResumeStep validation failed: name: Path `name` is required.")

    // test creating step
    userResponse = await request(server).post('/resume-steps').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            order: 0,
            is_optional: false,
            title: 'test title',
            name: 'test name'
        }
    ).expect(201)
    expect(userResponse.body.resumeStep).toMatchObject({
        order: 0,
        name: 'test name',
        title: 'test title',
        "__v": 0,
    })
})

test('Should update step', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const step = await ResumeStep.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).patch(`/resume-steps/${step._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).patch(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed step
    userResponse = await request(server).patch(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test patch not put
    userResponse = await request(server).patch(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "name": "new name"
    }).expect(200)
    expect(userResponse.body.name).toBe('new name')
})

test('Should delete step', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const step = await ResumeStep.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).delete(`/resume-steps/${step._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).delete(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user delete
    userResponse = await request(server).delete(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(200)
    
    //test if user delete not exists
    userResponse = await request(server).delete(`/resume-steps/${step._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(404)
})