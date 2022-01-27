const request = require('supertest')

const app = require('../src/app')

test('Should return the default page if user hit 404 page', async () => {
     server = app.listen();

     const response = await request(server).post('/blablabla/blablabla').send().expect(200)

     expect(response.text).toBe(`<html>\n<head>\n<title>Resume Builder</title></head><body><pre style=\"white-space: break-spaces;\"><h1>Resume Builder</h1>\n\nResume Builder are APIs used to create resumes for users and export it in PDF or HTML format\n\nYou can access the APIs documentations from <a href=\"${process.env.APP_URL}/swagger?docExpansion=none\">${process.env.APP_URL}/swagger?docExpansion=none</a>\n\nFirst user is the admin user and its credentials is:\n\nUsername: admin@dalialabs.com\nPassword: P@$$w0rd\n\nForm fields available are single line text, multi line text, date, image, check box, select, list, and rank, also fields marked as persistence will be auto filled every time the user try to create new resume\n\n\nThe walkthrough scenario:\n	Initialization:\n		1- Database must be initialized first to create the first admin user and to fill the field types\n		2- If you want to go throw a demo then you should seed demo data\n\n	Admin Part:\n		1-Admin login\n		2-Admin create Steps\n		3-Admin create Forms for these Steps\n		4-Admin add fields to these Forms\n		5-Admin design and upload Resume Template\n		\n	User Part:\n		1-User register or Login as a guest\n		2-User create resume by selecting template and theme color\n		3-User fill forms fields and submit it for validating and saving\n		4-User view the resume as HTML or download the resume as PDF</pre></body></html>`)
})
