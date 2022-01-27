const fs = require('fs');

const request = require('supertest')

const app = require('../src/app')
const authenticate = require('../src/middlewares/authenticate')

const ResumeFieldType = require('../src/models/resume-field-type');
const ResumeField = require('../src/models/resume-field');
const ResumeForm = require('../src/models/resume-form');
const ResumeStep = require('../src/models/resume-step');
const ResumeTemplate = require('../src/models/resume-template');
const Resume = require('../src/models/resume');
const User = require('../src/models/user');

const { initUser, initAdmin, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should init db [one admin user + field types] only', async () => {
    server = app.listen();

    await request(server).post('/db/init').send().expect(201)

    //test if only one user created
    const users = await User.find()
    expect(users.length).toBe(1)

    //test if user admin created as default
    expect(users[0]).toMatchObject({
        'name': 'admin',
        'roles': ['admin'],
        'email': 'admin@dalialabs.com',
    })

    //test if password encrypted
    expect(users[0].password).not.toBe('P@$$w0rd')

    //test if 8 field types created
    const resumeFieldTypes = await ResumeFieldType.find()
    expect(resumeFieldTypes.length).toBe(8)

    //test if resume field types created as default
    expect(resumeFieldTypes).toMatchObject([
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


    //test if nothing else created
    expect((await ResumeField.find()).length).toBe(0)
    expect((await ResumeForm.find()).length).toBe(0)
    expect((await ResumeStep.find()).length).toBe(0)
    expect((await ResumeTemplate.find()).length).toBe(0)
    expect((await Resume.find()).length).toBe(0)
})

test('Should seed-demo db', async () => {
    app.use(authenticate)
    server = app.listen();

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).post('/db/seed-demo').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    await user.generateAuthToken();
    const userResponse = await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')
    await user.remove()

    //test if admin call
    await request(server).post('/db/init').send().expect(201)
    const admin = await initAdmin()
    await admin.generateAuthToken();
    const adminResponse = await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)


    //test users didn't affected by seed-demo
    const users = await User.find()
    expect(users).toMatchObject([{
        'name': 'admin',
        'roles': ['admin'],
        'email': 'admin@dalialabs.com',
    }])
    expect(users[0].password).not.toBe('P@$$w0rd')

    //test if field didn't affected by seed-demo
    const resumeFieldTypes = await ResumeFieldType.find()
    expect(resumeFieldTypes.length).toBe(8)
    expect(resumeFieldTypes).toMatchObject([
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

    //test resume
    const resume = await Resume.find()
    expect(resume.length).toBe(0)

    //test resume template
    const resumeTemplates = await ResumeTemplate.find()
    expect(resumeTemplates).toMatchObject([
        {
            'name': 'ClassicTemplate',
            'title': 'Classic Template',
            'description': 'This is a classic template',
            'preview_data': {
                "PersonalDetails.Form.Photo": "data:image/png;base64,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",
                "PersonalDetails.Form.FirstName": "Ayman",
                "PersonalDetails.Form.LastName": "Elhaggar",
                "PersonalDetails.Form.Headline": "Senior Software Developer",
                "PersonalDetails.Form.Address": "Six of October Cairo",
                "PersonalDetails.Form.EmailAddress": "ayman.m.elhaggar@gmail.com",
                "PersonalDetails.Form.PhoneNumber": "+201278338428",
                "PersonalDetails.Form.DateOfBirth": "28 January 1988",
                "PersonalDetails.Form.PlaceOfBirth": "Place of Birth",
                "PersonalDetails.Form.DriversLicense": "Has Drivering License",
                "PersonalDetails.Form.Nationality": "Egyptian",
                "PersonalDetails.Form.Gender": "Male",
                "PersonalDetails.Form.CivilStatus": "Married",
                "PersonalDetails.Form.Website": "http://www.localhost.com/",
                "PersonalDetails.Form.LinkedIn": "http://www.linkedin.com/",
                "Education.Form.List": [
                    {
                        "Education.Form.List.Education": "Education 1",
                        "Education.Form.List.StartDateMonth": "February",
                        "Education.Form.List.StartDateYear": "2021",
                        "Education.Form.List.EndDateMonth": "January",
                        "Education.Form.List.EndDateYear": "2022",
                        "Education.Form.List.School": "School 1",
                        "Education.Form.List.City": "City 1",
                        "Education.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "Education.Form.List.Education": "Education 2",
                        "Education.Form.List.StartDateMonth": "February",
                        "Education.Form.List.StartDateYear": "2021",
                        "Education.Form.List.Present": true,
                        "Education.Form.List.School": "School 2",
                        "Education.Form.List.City": "City 2",
                        "Education.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "Employment.Form.List": [
                    {
                        "Employment.Form.List.Position": "Position 1",
                        "Employment.Form.List.StartDateMonth": "February",
                        "Employment.Form.List.StartDateYear": "2021",
                        "Employment.Form.List.EndDateMonth": "January",
                        "Employment.Form.List.EndDateYear": "2022",
                        "Employment.Form.List.Employer": "Employer 1",
                        "Employment.Form.List.City": "City 1",
                        "Employment.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "Employment.Form.List.Position": "Position 2",
                        "Employment.Form.List.StartDateMonth": "February",
                        "Employment.Form.List.StartDateYear": "2021",
                        "Employment.Form.List.Present": true,
                        "Employment.Form.List.Employer": "Employer 2",
                        "Employment.Form.List.City": "City 2",
                        "Employment.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "Profile.Form.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum",
                "Courses.Form.List": [
                    {
                        "Courses.Form.List.Course": "Course 1",
                        "Courses.Form.List.PeriodMonth": "January",
                        "Courses.Form.List.PeriodYear": "2022",
                        "Courses.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    },
                    {
                        "Courses.Form.List.Course": "Course 2",
                        "Courses.Form.List.Present": true,
                        "Courses.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    }
                ],
                "Internships.Form.List": [
                    {
                        "Internships.Form.List.Position": "Internship 1",
                        "Internships.Form.List.StartDateMonth": "February",
                        "Internships.Form.List.StartDateYear": "2021",
                        "Internships.Form.List.EndDateMonth": "January",
                        "Internships.Form.List.EndDateYear": "2022",
                        "Internships.Form.List.Employer": "Employer 1",
                        "Internships.Form.List.City": "City 1",
                        "Internships.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "Internships.Form.List.Position": "Internship 2",
                        "Internships.Form.List.StartDateMonth": "February",
                        "Internships.Form.List.StartDateYear": "2021",
                        "Internships.Form.List.Present": true,
                        "Internships.Form.List.Employer": "Employer 2",
                        "Internships.Form.List.City": "City 2",
                        "Internships.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "ExtracurricularActivities.Form.List": [
                    {
                        "ExtracurricularActivities.Form.List.Position": "Internship 1",
                        "ExtracurricularActivities.Form.List.StartDateMonth": "February",
                        "ExtracurricularActivities.Form.List.StartDateYear": "2021",
                        "ExtracurricularActivities.Form.List.EndDateMonth": "January",
                        "ExtracurricularActivities.Form.List.EndDateYear": "2022",
                        "ExtracurricularActivities.Form.List.Employer": "Employer 1",
                        "ExtracurricularActivities.Form.List.City": "City 1",
                        "ExtracurricularActivities.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "ExtracurricularActivities.Form.List.Position": "Internship 2",
                        "ExtracurricularActivities.Form.List.StartDateMonth": "February",
                        "ExtracurricularActivities.Form.List.StartDateYear": "2021",
                        "ExtracurricularActivities.Form.List.Present": true,
                        "ExtracurricularActivities.Form.List.Employer": "Employer 2",
                        "ExtracurricularActivities.Form.List.City": "City 2",
                        "ExtracurricularActivities.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "References.Form.List": [
                    {
                        "References.Form.List.Name": "Reference 1",
                        "References.Form.List.Organization": "Organization 1",
                        "References.Form.List.City": "City 1",
                        "References.Form.List.PhoneNumber": "01234567890",
                        "References.Form.List.EmailAddress": "asd@qwe.zxc",
                        "References.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "References.Form.List.Name": "Reference 2",
                        "References.Form.List.Organization": "Organization 2",
                        "References.Form.List.City": "City 2",
                        "References.Form.List.PhoneNumber": "01234567890",
                        "References.Form.List.EmailAddress": "asd@qwe.zxc",
                        "References.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "Certificates.Form.List": [
                    {
                        "Certificates.Form.List.Certificate": "Certificate 1",
                        "Certificates.Form.List.PeriodMonth": "January",
                        "Certificates.Form.List.PeriodYear": "2022",
                        "Certificates.Form.List.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                    },
                    {
                        "Certificates.Form.List.Certificate": "Certificate 2",
                        "Certificates.Form.List.Present": true,
                        "Certificates.Form.List.Description": "Maecenas varius dolor velit, sit amet fermentum ex interdum ut. Morbi iaculis, nunc ac vehicula tincidunt, enim lectus congue quam, vitae scelerisque nibh elit eu mauris. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In in nunc quis leo mattis elementum. Suspendisse massa ligula, vulputate at mollis id, ornare congue arcu. Pellentesque dictum nibh turpis, nec iaculis nisl maximus a. Pellentesque venenatis risus vel velit auctor, quis tempus orci eleifend. Nullam molestie vulputate lectus, a tristique diam dignissim quis."
                    }
                ],
                "Achievements.Form.Description": "Simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum",
                "Skills.Form.List": [
                    {
                        "Skills.Form.List.Skill": "Skill 1",
                        "Skills.Form.List.Level": 5
                    },
                    {
                        "Skills.Form.List.Skill": "Skill 2",
                        "Skills.Form.List.Level": 4
                    },
                    {
                        "Skills.Form.List.Skill": "Skill 3",
                        "Skills.Form.List.Level": 3
                    },
                    {
                        "Skills.Form.List.Skill": "Skill 4",
                        "Skills.Form.List.Level": 2
                    },
                    {
                        "Skills.Form.List.Skill": "Skill 5",
                        "Skills.Form.List.Level": 1
                    },
                    {
                        "Skills.Form.List.Skill": "Skill 6",
                        "Skills.Form.List.Level": 0
                    }
                ],
                "Languages.Form.List": [
                    {
                        "Languages.Form.List.Language": "Language 1",
                        "Languages.Form.List.Level": 5
                    },
                    {
                        "Languages.Form.List.Language": "Language 2",
                        "Languages.Form.List.Level": 4
                    },
                    {
                        "Languages.Form.List.Language": "Language 3",
                        "Languages.Form.List.Level": 3
                    },
                    {
                        "Languages.Form.List.Language": "Language 4",
                        "Languages.Form.List.Level": 2
                    },
                    {
                        "Languages.Form.List.Language": "Language 5",
                        "Languages.Form.List.Level": 1
                    },
                    {
                        "Languages.Form.List.Language": "Language 6",
                        "Languages.Form.List.Level": 0
                    }
                ],
                "Hobbies.Form.List": [
                    {
                        "Hobbies.Form.List.Hobby": "Hobby 1"
                    },
                    {
                        "Hobbies.Form.List.Hobby": "Hobby 2"
                    },
                    {
                        "Hobbies.Form.List.Hobby": "Hobby 3"
                    }
                ],
                "Qualities.Form.List": [
                    {
                        "Qualities.Form.List.Quality": "Quality 1"
                    },
                    {
                        "Qualities.Form.List.Quality": "Quality 2"
                    },
                    {
                        "Qualities.Form.List.Quality": "Quality 3"
                    }
                ]
            },
            'html_template': fs.readFileSync('src/templates/classic_template.html').toString(),
            'keywords': ['classic']
        }
    ])

    //test resume steps
    const resumeSteps = await ResumeStep.find()
    expect(resumeSteps).toMatchObject([
        {
            'name': 'PersonalDetails',
            'title': 'Personal Details',
            'is_optional': false,
            'order': 1
        },
        {
            'name': 'Education',
            'title': 'Education',
            'is_optional': false,
            'order': 2
        },
        {
            'name': 'Employment',
            'title': 'Employment',
            'is_optional': false,
            'order': 3
        },
        {
            'name': 'Skills',
            'title': 'Skills',
            'is_optional': false,
            'order': 4
        },
        {
            'name': 'Languages',
            'title': 'Languages',
            'is_optional': false,
            'order': 5
        },
        {
            'name': 'Hobbies',
            'title': 'Hobbies',
            'is_optional': false,
            'order': 6
        },
        {
            'name': 'Profile',
            'title': 'Profile',
            'is_optional': true,
            'order': 7
        },
        {
            'name': 'Courses',
            'title': 'Courses',
            'is_optional': true,
            'order': 8
        },
        {
            'name': 'Internships',
            'title': 'Internships',
            'is_optional': true,
            'order': 9
        },
        {
            'name': 'ExtracurricularActivities',
            'title': 'Extracurricular Activities',
            'is_optional': true,
            'order': 10
        },
        {
            'name': 'References',
            'title': 'References',
            'is_optional': true,
            'order': 11
        },
        {
            'name': 'Qualities',
            'title': 'Qualities',
            'is_optional': true,
            'order': 12
        },
        {
            'name': 'Certificates',
            'title': 'Certificates',
            'is_optional': true,
            'order': 13
        },
        {
            'name': 'Achievements',
            'title': 'Achievements',
            'is_optional': true,
            'order': 14
        }
    ])

    //test resume forms
    const resumeForms = await ResumeForm.find()
    expect(resumeForms).toMatchObject([
        {
            'name': 'PersonalDetails.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'PersonalDetails' }))._id,
            'order': 1
        },
        {
            'name': 'Education.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Education' }))._id,
            'order': 2
        },
        {
            'name': 'Employment.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Employment' }))._id,
            'order': 3
        },
        {
            'name': 'Skills.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Skills' }))._id,
            'order': 4
        },
        {
            'name': 'Languages.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Languages' }))._id,
            'order': 5
        },
        {
            'name': 'Hobbies.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Hobbies' }))._id,
            'order': 6
        },
        {
            'name': 'Profile.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Profile' }))._id,
            'order': 7
        },
        {
            'name': 'Courses.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Courses' }))._id,
            'order': 8
        },
        {
            'name': 'Internships.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Internships' }))._id,
            'order': 9
        },
        {
            'name': 'ExtracurricularActivities.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'ExtracurricularActivities' }))._id,
            'order': 10
        },
        {
            'name': 'References.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'References' }))._id,
            'order': 11
        },
        {
            'name': 'Qualities.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Qualities' }))._id,
            'order': 12
        },
        {
            'name': 'Certificates.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Certificates' }))._id,
            'order': 13
        },
        {
            'name': 'Achievements.Form',
            'title': '',
            'description': '',
            'step': (await ResumeStep.findOne({ name: 'Achievements' }))._id,
            'order': 14
        }
    ])

    //test resume fields
    const resumeFields = await ResumeField.find()
    expect(resumeFields).toMatchObject([
        // PersonalDetails.Form
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Photo',
            'type': (await ResumeFieldType.findOne({ name: 'Image' }))._id,
            'parent_order': 1,
            'title': 'Photo',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.FirstName',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 2,
            'title': 'First Name',
            'is_optional': false,
            'is_required': true,
            'is_required_err_message': 'Please enter your first name',
            'is_persistent_data': true,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.LastName',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 3,
            'title': 'Last Name',
            'is_optional': false,
            'is_required': true,
            'is_required_err_message': 'Please enter your last name',
            'is_persistent_data': true,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.EmailAddress',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 4,
            'subtype': 'email',
            'title': 'Email Address',
            'is_optional': false,
            'is_required': true,
            'is_required_err_message': 'Please enter your email',
            'is_persistent_data': true,
            'regexs': ['^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'],
            'regexs_err_messages': ['Invalid Email Address'],
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Headline',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 5,
            'title': 'Headline',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.PhoneNumber',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 6,
            'subtype': 'number',
            'title': 'Phone Number',
            'hints': '+201X XXXX XXXX',
            'is_optional': false,
            'is_persistent_data': true,
            'regexs': ['^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$'],
            'regexs_err_messages': ['Invalid Phone Number'],
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Address',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 7,
            'title': 'Address',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.PostCode',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 8,
            'title': 'Post Code',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 9,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.DateOfBirth',
            'type': (await ResumeFieldType.findOne({ name: 'Date' }))._id,
            'parent_order': 10,
            'subtype': 'date',
            'title': 'Date of Birth',
            'hints': 'format is 2022-01-28',
            'is_optional': true,
            'size': 'lg',
            'format': 'yyyy-MM-dd'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.PlaceOfBirth',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 11,
            'title': 'Place of Birth',
            'is_optional': true,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.DriversLicense',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 12,
            'title': 'Driver\'s license',
            'is_optional': true,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Gender',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent_order': 13,
            'title': 'Gender',
            'is_optional': true,
            'size': 'lg',
            'suggested_values': ['Male', 'Female']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Nationality',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 14,
            'title': 'Nationality',
            'is_optional': true,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.CivilStatus',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent_order': 15,
            'title': 'Civil Status',
            'is_optional': true,
            'size': 'lg',
            'suggested_values': ['Unmarried', 'Married', 'Divorced', 'Widowed']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.Website',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 16,
            'subtype': 'url',
            'title': 'Website',
            'is_optional': true,
            'regexs': ['/^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$'],
            'regexs_err_messages': ['Invalid Url'],
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'PersonalDetails.Form' }))._id,
            'name': 'PersonalDetails.Form.LinkedIn',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent_order': 17,
            'subtype': 'url',
            'title': 'LinkedIn',
            'is_optional': true,
            'regexs': ['/^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$'],
            'regexs_err_messages': ['Invalid Url'],
            'size': 'lg',
            'initial_value': 'https://www.linkedin.com/in/'
        },

        // Education.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.Education',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Education',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.School',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 2,
            'title': 'School',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 3,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.StartDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Start Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.StartDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 5,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.EndDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 6,
            'title': 'End Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.EndDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 7,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 8,
            'title': 'Present',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Education.Form' }))._id,
            'name': 'Education.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Education.Form.List' }))._id,
            'parent_order': 9,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // Employment.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.Position',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Position',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.Employer',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Employer',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 3,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.StartDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Start Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.StartDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 5,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.EndDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 6,
            'title': 'End Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.EndDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 7,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 8,
            'title': 'Present',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Employment.Form' }))._id,
            'name': 'Employment.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Employment.Form.List' }))._id,
            'parent_order': 9,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },


        // Skills.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Skills.Form' }))._id,
            'name': 'Skills.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Skills.Form' }))._id,
            'name': 'Skills.Form.List.Skill',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Skills.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Skill',
            'is_optional': false,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Skills.Form' }))._id,
            'name': 'Skills.Form.List.Level',
            'type': (await ResumeFieldType.findOne({ name: 'Rank' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Skills.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Level',
            'is_optional': false,
            'size': 'md'
        },


        // Languages.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Languages.Form' }))._id,
            'name': 'Languages.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Languages.Form' }))._id,
            'name': 'Languages.Form.List.Language',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Languages.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Language',
            'is_optional': false,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Languages.Form' }))._id,
            'name': 'Languages.Form.List.Level',
            'type': (await ResumeFieldType.findOne({ name: 'Rank' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Languages.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Level',
            'is_optional': false,
            'size': 'md'
        },

        // Hobbies.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Hobbies.Form' }))._id,
            'name': 'Hobbies.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Hobbies.Form' }))._id,
            'name': 'Hobbies.Form.List.Hobby',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Hobbies.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Hobby',
            'is_optional': false,
            'size': 'md'
        },

        // Profile.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Profile.Form' }))._id,
            'name': 'Profile.Form.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent_order': 1,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // Courses.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List.Course',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Courses.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Course',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List.PeriodYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Courses.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Period',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List.PeriodMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Courses.Form.List' }))._id,
            'parent_order': 3,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Courses.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Present',
            'is_optional': false,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Courses.Form' }))._id,
            'name': 'Courses.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Courses.Form.List' }))._id,
            'parent_order': 5,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // Internships.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.Position',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Position',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.Employer',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Employer',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 3,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.StartDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Start Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.StartDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 5,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.EndDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 6,
            'title': 'End Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.EndDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 7,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 8,
            'title': 'Present',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Internships.Form' }))._id,
            'name': 'Internships.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Internships.Form.List' }))._id,
            'parent_order': 9,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // ExtracurricularActivities.Form

        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.Position',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Position',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.Employer',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Employer',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 3,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.StartDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Start Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.StartDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 5,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.EndDateYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 6,
            'title': 'End Date',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.EndDateMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 7,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 8,
            'title': 'Present',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'ExtracurricularActivities.Form' }))._id,
            'name': 'ExtracurricularActivities.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'ExtracurricularActivities.Form.List' }))._id,
            'parent_order': 9,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // References.Form

        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.Name',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Name',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.Organization',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Organization',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.City',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 3,
            'title': 'City',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.PhoneNumber',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Phone Number',
            'is_optional': false,
            'regexs': ['^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$'],
            'regexs_err_messages': ['Invalid Phone Number'],
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.EmailAddress',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 5,
            'title': 'Email Address',
            'is_optional': false,
            'regexs': ['^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'],
            'regexs_err_messages': ['Invalid Email Address'],
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'References.Form' }))._id,
            'name': 'References.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'References.Form.List' }))._id,
            'parent_order': 6,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },

        // Qualities.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Qualities.Form' }))._id,
            'name': 'Qualities.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Qualities.Form' }))._id,
            'name': 'Qualities.Form.List.Quality',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Qualities.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Quality',
            'is_optional': false,
            'size': 'md'
        },

        // Certificates.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List',
            'type': (await ResumeFieldType.findOne({ name: 'List' }))._id,
            'parent_order': 1,
            'is_optional': false,
            'is_collapsible': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List.Certificate',
            'type': (await ResumeFieldType.findOne({ name: 'Single Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Certificates.Form.List' }))._id,
            'parent_order': 1,
            'title': 'Certificate',
            'is_optional': false,
            'size': 'lg'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List.PeriodYear',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Certificates.Form.List' }))._id,
            'parent_order': 2,
            'title': 'Period',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': [{ from: 1990, to: 2099 }]
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List.PeriodMonth',
            'type': (await ResumeFieldType.findOne({ name: 'Select' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Certificates.Form.List' }))._id,
            'parent_order': 3,
            'subtype': 'number',
            'is_optional': false,
            'size': 'sm',
            'suggested_values': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List.Present',
            'type': (await ResumeFieldType.findOne({ name: 'Check' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Certificates.Form.List' }))._id,
            'parent_order': 4,
            'title': 'Present',
            'is_optional': false,
            'size': 'md'
        },
        {
            'form': (await ResumeForm.findOne({ name: 'Certificates.Form' }))._id,
            'name': 'Certificates.Form.List.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent': (await ResumeField.findOne({ name: 'Certificates.Form.List' }))._id,
            'parent_order': 5,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        },


        // Achievements.Form

        {
            'form': (await ResumeForm.findOne({ name: 'Achievements.Form' }))._id,
            'name': 'Achievements.Form.Description',
            'type': (await ResumeFieldType.findOne({ name: 'Multi Line Text' }))._id,
            'parent_order': 1,
            'title': 'Description',
            'is_optional': false,
            'size': 'lg'
        }
    ])
})

test('Should clear db', async () => {
    app.use(authenticate)
    server = app.listen();

    //test if anonymous user try to access
    const notLoggedInResponse = await request(server).post('/db/clear').send().expect(401)
    expect(notLoggedInResponse.body.error).toBe('User is not logged in')

    //test if user try to access
    const user = await initUser()
    await user.generateAuthToken();
    const userResponse = await request(server).post('/db/clear').set({ Authorization: `Bearer ${user.tokens[0].token}` }).send().expect(401)
    expect(userResponse.body.error).toBe('User is unauthorized to do this action')
    await user.remove()

    //test if admin call
    await request(server).post('/db/init').send().expect(201)
    const admin = await initAdmin()
    await admin.generateAuthToken();
    await request(server).post('/db/seed-demo').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(201)

    const resume = new Resume({
        template: (await ResumeTemplate.findOne())._id,
        template_color: 'red',
        owner: admin._id,
        current_form: (await ResumeForm.findOne())._id,
        is_current_form_valid: false,
        data: {}
     })
    await resume.save()

    await request(server).post('/db/clear').set({ Authorization: `Bearer ${admin.tokens[0].token}` }).send().expect(200)

    //test all data are cleared
    expect((await ResumeFieldType.find()).length).toBe(0)
    expect((await ResumeField.find()).length).toBe(0)
    expect((await ResumeForm.find()).length).toBe(0)
    expect((await ResumeStep.find()).length).toBe(0)
    expect((await ResumeTemplate.find()).length).toBe(0)
    expect((await Resume.find()).length).toBe(0)  
    expect((await User.find()).length).toBe(0)  
})