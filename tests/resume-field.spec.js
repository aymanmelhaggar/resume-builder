const request = require('supertest')

const app = require('../src/app')

const authenticate = require('../src/middlewares/authenticate')

const ResumeField = require('../src/models/resume-field');
const ResumeFieldType = require('../src/models/resume-field-type');
const ResumeForm = require('../src/models/resume-form');

const { initUser, initAdmin, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should return all fields', async () => {
    app.use(authenticate)
    server = app.listen();


    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get('/resume-fields').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve all
    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-fields').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    const allFields = userResponse.body;
    expect(userResponse.body.length > 0).toBeTruthy();

    //test if retrieve all with limit
    userResponse = await request(server).get('/resume-fields?limit=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allFields[0]])

    //test if retrieve all with skip
    userResponse = await request(server).get('/resume-fields?skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject(allFields.slice(1))

    //test if retrieve all with limit and skip
    userResponse = await request(server).get('/resume-fields?limit=1&skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([allFields[1]])
})

test('Should return field', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const field = await ResumeField.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get(`/resume-fields/${field._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve none exists field
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-fields/61f1fe882529af0d43f6b85e').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(404)
    expect(userResponse.body.error).toBe('ResumeField not found')

    //test if retrieve a field
    userResponse = await request(server).get(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    //TODO: check why date returned as string
    delete userResponse.body.createdAt
    delete userResponse.body.updatedAt
    const { __v, _id, form, is_optional, name, parent, parent_order, regexs, regexs_err_messages, size, suggested_values, title, type } = field
    expect(userResponse.body).toMatchObject({ __v, _id, form, is_optional, name, parent, parent_order, regexs, regexs_err_messages, size, suggested_values, title, type })

})

test('Should create field', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).post('/resume-fields').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed field
    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test mandatory fields
    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
        }
    ).expect(400)
    expect(userResponse.body.error).toBe('ResumeField validation failed: is_optional: Path `is_optional` is required., parent_order: Path `parent_order` is required., type: Path `type` is required., name: Path `name` is required., form: Path `form` is required.')

    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            is_optional: false
        }
    ).expect(400)
    expect(userResponse.body.error).toBe('ResumeField validation failed: parent_order: Path `parent_order` is required., type: Path `type` is required., name: Path `name` is required., form: Path `form` is required.')

    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            is_optional: false,
            parent_order: 0
        }
    ).expect(400)
    expect(userResponse.body.error).toBe('ResumeField validation failed: type: Path `type` is required., name: Path `name` is required., form: Path `form` is required.')
    
    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            is_optional: false,
            parent_order: 0,
            type: '61f1fe882529af0d43f6b85e'
        }
    ).expect(400)
    expect(userResponse.body.error).toBe('ResumeField validation failed: name: Path `name` is required., form: Path `form` is required.')
    
    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            is_optional: false,
            parent_order: 0,
            type: '61f1fe882529af0d43f6b85e',
            name: 'test'
        }
    ).expect(400)
    expect(userResponse.body.error).toBe('ResumeField validation failed: form: Path `form` is required.')
    
    // test creating field
    userResponse = await request(server).post('/resume-fields').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send(
        {
            is_optional: false,
            parent_order: 0,
            type: await ResumeFieldType.findOne(),
            name: 'test',
            form: await ResumeForm.findOne()
        }
    ).expect(201)
    expect(userResponse.body.resumeField).toMatchObject({
        "regexs": [],
        "regexs_err_messages": [],
        "suggested_values": [],
        is_optional: false,
        parent_order: 0,
        type: (await ResumeFieldType.findOne())._id,
        name: 'test',
        form: (await ResumeForm.findOne())._id,
        "__v": 0,
    })
})

test('Should update field', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const field = await ResumeField.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).patch(`/resume-fields/${field._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).patch(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user send not allowed field
    userResponse = await request(server).patch(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "test field": "test value"
    }).expect(400)
    expect(userResponse.body.error).toBe('Bad Request')

    //test patch not put
    userResponse = await request(server).patch(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send({
        "name": "new name"
    }).expect(200)
    expect(userResponse.body.name).toBe('new name')
})

test('Should delete field', async () => {
    app.use(authenticate)
    server = app.listen();

    await request(server).post('/db/init').send()
    const admin = await initAdmin()
    admin.generateAuthToken()
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const field = await ResumeField.findOne()

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).delete(`/resume-fields/${field._id}`).send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).delete(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')

    //test if user delete
    userResponse = await request(server).delete(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(200)
    
    //test if user delete not exists
    userResponse = await request(server).delete(`/resume-fields/${field._id}`).set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(404)
})