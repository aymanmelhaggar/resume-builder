const request = require('supertest')

const app = require('../src/app')

const authenticate = require('../src/middlewares/authenticate')

const ResumeFieldType = require('../src/models/resume-field-type');

const { initUser, initAdmin, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should return all field types', async () => {
    app.use(authenticate)
    server = app.listen();


    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).get('/resume-field-types').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if retrieve all
    await request(server).post('/db/init').send()
    const user = await initUser()
    user.generateAuthToken()
    var userResponse = await request(server).get('/resume-field-types').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([
        {
            'name': 'Check'
        },
        {
            'name': 'Date'
        },
        {
            'name': 'Image'
        },
        {
            'name': 'List'
        },
        {
            'name': 'Multi Line Text'
        },
        {
            'name': 'Rank'
        },
        {
            'name': 'Select'
        },
        {
            'name': 'Single Line Text'
        }
    ])

    //test if retrieve all with limit
    userResponse = await request(server).get('/resume-field-types?limit=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([
        {
            'name': 'Check'
        }
    ])

    //test if retrieve all with skip
    userResponse = await request(server).get('/resume-field-types?skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([
        {
            'name': 'Date'
        },
        {
            'name': 'Image'
        },
        {
            'name': 'List'
        },
        {
            'name': 'Multi Line Text'
        },
        {
            'name': 'Rank'
        },
        {
            'name': 'Select'
        },
        {
            'name': 'Single Line Text'
        }
    ])

    //test if retrieve all with limit and skip
    userResponse = await request(server).get('/resume-field-types?limit=1&skip=1').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(200)
    expect(userResponse.body).toMatchObject([
        {
            'name': 'Date'
        }
    ])
})