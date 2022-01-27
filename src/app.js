//core
const Koa = require('koa');
const serve = require('koa-static')

//middlewares
const { koaSwagger } = require('koa2-swagger-ui');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');

//db
const mongoose = require('./db/mongoose')

//custom middlewares
const jsonErrorResponse = require('./middlewares/json-error-response');
const authenticate = require('./middlewares/authenticate');

//routes
const resumeFieldTypeRouter = require('./routers/resume-field-type');
const resumeFieldRouter = require('./routers/resume-field');
const resumeFormRouter = require('./routers/resume-form');
const resumeStepRouter = require('./routers/resume-step');
const resumeTemplateRouter = require('./routers/resume-template');
const resumeRouter = require('./routers/resume');
const userRouter = require('./routers/user');
const infoRouter = require('./routers/info');
const dbRouter = require('./routers/db');

const app = new Koa();

//middlewares configiurations
app.use(serve('./public'))
app.use(
    koaSwagger({
        routePrefix: '/swagger',
        swaggerOptions: {
            url: process.env.SWAGGER_FILE,
        },
    }),
);
app.use(bodyParser());

app.keys = [process.env.APP_KEY];
app.use(session(app));

app.use(jsonErrorResponse);

app.use(authenticate);


//routes configurations
app.use(resumeFieldTypeRouter.routes());
app.use(resumeFieldTypeRouter.allowedMethods({ throw: true }));

app.use(resumeFieldRouter.routes());
app.use(resumeFieldRouter.allowedMethods({ throw: true }));

app.use(resumeFormRouter.routes());
app.use(resumeFormRouter.allowedMethods({ throw: true }));

app.use(resumeStepRouter.routes());
app.use(resumeStepRouter.allowedMethods({ throw: true }));

app.use(resumeTemplateRouter.routes());
app.use(resumeTemplateRouter.allowedMethods({ throw: true }));

app.use(resumeRouter.routes());
app.use(resumeRouter.allowedMethods({ throw: true }));

app.use(userRouter.routes());
app.use(userRouter.allowedMethods({ throw: true }));

app.use(dbRouter.routes());
app.use(dbRouter.allowedMethods({ throw: true }));

app.use(infoRouter.routes());

module.exports = app;