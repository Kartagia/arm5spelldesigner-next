Ars Magica 5 Definite Edition Spell Designer
============================================

This is a server to run Ars Magica 5 Definite Edition spell designer.

## Installation

To install all dependencies, perform installation of node modules.
```bash
npm -i
```

## Configuration

There is two ways to configure the application: 

### Setup environmental variables

Environmental variables can be set in the shell, in .env file, or in .env.admin for
administrator script environment. The environment files are put into the root
directory of the project. 

#### Server environmental variables

|Variable|Scope|Description|Default|
| :---: | :---: | :---: | :---: |
|APP_NAME|Heroku|The heroku application name|No default.|
|PORT|Server|The port server is listenning by default.|3000|
|APPLICATION_NAME|Server|The application name.|"Ars Magica Campaign Aid"|

#### API environmental variables

These variables determines the API access values.
They may be set in user's environment, or in the user environment file .env.

|Variable|Scope|Description|Default|
| :---: | :---: | :---: | :---: |
|DATA_CONNECT|Api|The database connection URL for api database|The enviromental variable DATABASE_URL|
|DATABASE_URL|all|The default dabase commection url or socket.|No connection url. Use variables below.|
|DATA_HOST|Api|The api server host|"localhost"|
|DATA_DATABASE|Api|The api database name|Usre name (process.env.USER)|
|DATA_PORT|Api|The api database port|5432|
|DATA_USER|Api|The api database user|User name (process.env.USER)|
|DATA_PASSWORD|Api|The api database user password|No password (null)|

#### Authentication environmental variables

These variables determiens the authentication database access. They may be set in the 
user's environment, or in the user environment file .env.

|Variable|Scope|Description|Default|
| :---: | :---: | :---: | :---: |
|AUTH_CONNECT|Authentication|The database connection URL for the authentication database|The enviromental variable DATABASE_URL|
|DATABASE_URL|all|The default dabase commection url or socket.|No connection url. Use variables below.|
|AUTH_HOST|Authentication|The authentication server host|"localhost"|
|AUTH_DATABASE|Authentication|The authentication database name|User name (process.env.USER)|
|AUTH_PORT|Authentication|The authentication database port|5432|
|AUTH_USER|Authentication|The authentication database user|User name (process.env.USER)|
|AUTH_PASSWORD|Authentication|The authentication database user password|No password (null)|

#### Script enviroment variables 

The script uses both authentication and api environment variables, but allows setting
specific variables for scripts to access the database. 
They should be set in user's environment, or in the administartor environemnt file .env.admin.

If admnistrator user is not designated, the same database uses should have rights to create, drop, insert,
sequence, and reference priviledges for the database.

The administartor access uses corresponding user database variables except connection, user, and password
variables, which are replaced with variables: 

|Variable|Type|Description|Default|
| :---: | :---: | :---: | :---: |
|DATA_ADMIN_CONNECT|Api|The administrator database connection URL for api database|The api database connection url (process.env.DATA_CONNECT) or use variables below|
|DATA_ADMIN|Api|The database user|The Api database administrator user name (process.env.API_USER)|
|DATA_ADMIN_PASSWORD|Api|The Api database user password|The Api database user name (process.env.API_PASSWORD)|
|AUTH_ADMIN_CONNECT|Authentication|The administrator database connection URL for the authentication database|The authentication database connection url (process.env.AUTH_CONNECT) or use variables below.|
|AUTH_ADMIN|Authentication|The database user|The authentication database administrator user name (process.env.AUTH_USER)|
|AUTH_ADMIN_PASSWORD|Authentication|The Api database user password|The authentication database user name (process.env.AUTH_PASSWORD)|

### Altering configuration files. 

## Database initialization

Database initialization must be performed from database dump at the moment.

## Running 

To start the development version, please run following commands:

```bash
npm run dev
```

To start the production version, please run following commands:
```bash
npm run build && npm start
``` 

## Deploy to Heroku

### To deploy to Heroku, you must have GIT and Heroku CLI installed. 

If you do not have Git installed, the check out (https://devcenter.heroku.com/articles/git)[Heroku GIT installation instructions].

If you do not have Heroku CLI installed, you may use npm installation described below, or follow (https://devcenter.heroku.com/articles/heroku-cli#install-the-heroku-cli)[Heroku instructions to install Heroku CLI].

The package contains scripts for node and npm using installation, which you may use if you do need Heroku only for this
application, or you do want to control when Heroku CLI is updated. 

### Install heroku CLI using Node (Optional, if user has Heroku CLI)

If you do not have Heroku CLI installed, you may install Heroku CLI
with provided script "heroku:install".

#### Unix and Mac users
```bash
npm run heroku:install
```

#### Windows users command prompt 
```cmd.exe
npm run heroku:install:win
```

### Login into Heroku (optional)

If you have not yet logged into heroku, perform login using CLI.
The heroku app will instruct you how to login using a web browser. 
The browser does not need to be on the same computer as the command
is run, but you may use your other computer or phone. 

#### Unix and Mac users 
```bash
npm run heroku:login
```

#### Windows users command prompt 
```cmd.exe
npm run heroku:login:win
```

If you do not have web browser available, and your Heroku account does not have
multi-factor authentication set, you may use interactive console login with:

#### Unix and Mac users 
```bash
npm run heroku:login:prompt
```

#### Windows users command prompt 
```cmd.exe
npm run heroku:login:win:prompt
```


### Create a new Heroku app (optional, if you do have existing app)

In order to create a new Heroku App, use following command with "your_app_name"
replaced with your app name.

#### Unix and Mac users 
```bash
export APP_NAME=your_app_name;
npm run heroku:create
```

#### Windows users using command prompt
```cmd.exe
set APP_NAME=your_app_name
npm run heroku:create:win
```


### Initialize the Heroku app, if you do have existing app (optional). 

If you already have heroku app, you want to use, do following commands
replacing "your_app_name" with your app name. 

#### Unix and Mac users 
```bash
export APP_NAME=your_app_name;
npm run heroku:init
```

#### Windows users using command prompt
```cmd.exe
set APP_NAME=your_app_name
npm run heroku:init:win
```

### Ensure your Heroku has Postgres add-on

Ensure at your Heroku account that your application has postgres add-on
with Heroku dashboard (https://dashboard.heroku.com). 
- Postgres of Essential-0 is suitable for the proejct. 

### Creating local database (optional step for developers)

Create local database. The local database must exist, but it will be clean built.

#### Unix and Mac users 
```bash
npm run heroku:db:init:local -- local_database
```

#### Windows users using command prompt

```cmd.exe
npm run heroku:db:init:local:win -- local_database
```


### Transfer database to Heroku (if it is not yet there)

To transfer the database from local_database to the heroku server.

The migration will ask you to config reset of the heroku database by giving the application
name. The application name is shown in the prompt.

#### Unix and Mac users 
```bash
npm run heroku:db:init -- local_database
```

#### Windows users using command prompt

```cmd.exe
npm run heroku:db:init:win -- local_database
```

### Perform build and commit the "heroku" branch to the heroku remote main. 

By default I do use heroku as the branch containing the heroku main. 
The script will show output of the deployment build with possible errors.

```bash
    npm run heroku:deploy
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
